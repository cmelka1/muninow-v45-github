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
  isLoggingOut: boolean;
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
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  isSessionValid: () => boolean;
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
    if (isLoggingOut) return; // Prevent multiple logout attempts
    
    setIsLoggingOut(true);
    
    try {
      // Clear cross-tab session storage immediately
      localStorage.removeItem('active_session_id');
      
      // Clear local state first
      setProfile(null);
      setUser(null);
      setSession(null);
      
      // Only attempt logout if we have a valid session
      if (session && isSessionValid()) {
        const { error } = await supabase.auth.signOut();
        if (error && error.message !== 'Session not found') {
          console.warn('Logout error:', error.message);
          // Don't throw error for expired sessions - user is effectively logged out
        }
      }
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
      
      // Small delay to ensure state is cleared before navigation
      setTimeout(() => {
        window.location.href = '/signin';
      }, 100);
      
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Always clear local state even if server logout fails
      setProfile(null);
      setUser(null);
      setSession(null);
      localStorage.removeItem('active_session_id');
      
      // Still redirect user - they're effectively logged out locally
      setTimeout(() => {
        window.location.href = '/signin';
      }, 100);
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

  const validateSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session validation error:', error);
        return false;
      }
      
      if (!session) {
        console.warn('No active session found');
        return false;
      }
      
      // Check if session is expired
      const now = new Date().getTime();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      
      if (expiresAt && now >= expiresAt) {
        console.warn('Session has expired');
        return false;
      }
      
      // Check if session expires within next 5 minutes (300 seconds)
      const expiresWithinFiveMinutes = expiresAt && (expiresAt - now) < (5 * 60 * 1000);
      
      if (expiresWithinFiveMinutes) {
        console.warn('Session expires within 5 minutes, should refresh');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        console.log('Session refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  };

  const isSessionValid = (): boolean => {
    if (!session) return false;
    
    const now = new Date().getTime();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    
    return expiresAt ? now < expiresAt : true;
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isSubmitting,
    isLoggingOut,
    loginError,
    isForgotPasswordOpen,
    resetSent,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    setForgotPasswordOpen,
    clearError,
    validateSession,
    refreshSession,
    isSessionValid
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};