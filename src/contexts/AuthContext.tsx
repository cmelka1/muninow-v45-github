import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  account_type: string;
  role: string;
  phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  business_legal_name?: string;
  customer_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isSubmitting: boolean;
  loginError: string | null;
  isForgotPasswordOpen: boolean;
  resetSent: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  setForgotPasswordOpen: (open: boolean) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Load user profile
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile loading error:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Profile loading error:', error);
      setIsLoading(false);
    }
  };

  // Initialize authentication state
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Don't automatically redirect based on profile - let Auth.tsx handle successful login redirects
  // Individual protected routes will handle their own authentication checks

  const signIn = async (email: string, password: string) => {
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        setLoginError(error.message);
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      setLoginError(error.message);
      return { error };
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        setLoginError(error.message);
        return { error };
      }

      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link."
      });
      
      return { error: null };
    } catch (error: any) {
      setLoginError(error.message);
      return { error };
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Logout error:', error.message);
      }
      
      // Clear local state
      setProfile(null);
      setUser(null);
      setSession(null);
      
      // Redirect to signin page
      window.location.href = '/signin';
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "There was an issue signing out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetPassword = async (email: string) => {
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        setLoginError(error.message);
        return { error };
      }

      setResetSent(true);
      setIsForgotPasswordOpen(false);
      
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions."
      });
      
      return { error: null };
    } catch (error: any) {
      setLoginError(error.message);
      return { error };
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePassword = async (password: string) => {
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setLoginError(error.message);
        return { error };
      }

      toast({
        title: "Password updated",
        description: "Your password has been successfully updated."
      });
      
      return { error: null };
    } catch (error: any) {
      setLoginError(error.message);
      return { error };
    } finally {
      setIsSubmitting(false);
    }
  };

  const setForgotPasswordOpen = (open: boolean) => {
    setIsForgotPasswordOpen(open);
    if (!open) {
      setResetSent(false);
      setLoginError(null);
    }
  };

  const clearError = () => {
    setLoginError(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isSubmitting,
    loginError,
    isForgotPasswordOpen,
    resetSent,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    setForgotPasswordOpen,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};