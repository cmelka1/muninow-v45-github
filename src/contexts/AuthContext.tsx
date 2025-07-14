import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionWarningDialog } from '@/components/SessionWarningDialog';

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
  isSessionWarningOpen: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: (reason?: 'user' | 'timeout' | 'external') => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  setForgotPasswordOpen: (open: boolean) => void;
  clearError: () => void;
  extendSession: () => void;
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
  const [isSessionWarningOpen, setIsSessionWarningOpen] = useState(false);
  const [logoutReason, setLogoutReason] = useState<'user' | 'external' | 'timeout' | null>(null);

  // Load user profile with timeout protection
  const loadProfile = async (userId: string) => {
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 10000); // 10 second timeout

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (error) {
        setIsLoading(false);
        return;
      }

      if (data) {
        setProfile(data);
      }
      
      setIsLoading(false);
    } catch (error) {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  // Initialize authentication state
  useEffect(() => {
    let currentUserId: string | null = null;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id || null;
        
        // Detect if a different user has logged in elsewhere
        if (currentUserId && newUserId && currentUserId !== newUserId) {
          setLogoutReason('external');
          toast({
            title: "Signed out",
            description: "You've been signed out because another user logged in.",
            variant: "destructive"
          });
        } else if (event === 'SIGNED_OUT' && logoutReason === 'timeout') {
          // Don't show additional toast for timeout logouts
        } else if (event === 'SIGNED_OUT' && currentUserId && !newUserId) {
          // This is likely an external logout or session invalidation
          if (logoutReason !== 'user' && logoutReason !== 'timeout') {
            setLogoutReason('external');
            toast({
              title: "Session ended",
              description: "Your session has been ended from another location.",
              variant: "destructive"
            });
          }
        }
        
        currentUserId = newUserId;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Load profile for authenticated user with timeout protection
          setTimeout(() => {
            loadProfile(session.user.id);
          }, 0);
        } else {
          // Clear profile and state when user signs out
          setProfile(null);
          setIsLoading(false);
          
          // Redirect to signin page if not already there
          if (!window.location.pathname.includes('/signin') && !window.location.pathname.includes('/auth')) {
            window.location.href = '/signin';
          }
        }
      }
    );

    // THEN check for existing session
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

  // Redirect users based on account type after profile loads
  useEffect(() => {
    if (!isLoading && user && profile) {
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on correct path or on auth/signup pages
      if (currentPath.includes('/auth') || currentPath.includes('/signup') || currentPath.includes('/reset-password')) {
        return;
      }

      // Redirect based on account type
      if (profile.account_type === 'municipal' && !currentPath.startsWith('/municipal')) {
        window.location.href = '/municipal/dashboard';
      } else if (profile.account_type === 'superAdmin' && !currentPath.startsWith('/superadmin')) {
        // Keep existing super admin redirect logic if needed
      } else if (['resident', 'business'].includes(profile.account_type) && currentPath.startsWith('/municipal')) {
        window.location.href = '/dashboard';
      }
    }
  }, [user, profile, isLoading]);

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

  const signOut = async (reason: 'user' | 'timeout' | 'external' = 'user') => {
    try {
      // Set logout reason to prevent duplicate toast messages
      setLogoutReason(reason);
      
      // Clear session warning dialog
      setIsSessionWarningOpen(false);
      
      // Check if session exists before attempting logout
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        const { error } = await supabase.auth.signOut();
        if (error && !error.message.includes('session not found')) {
          console.warn('Logout error:', error.message);
        }
      }
      
      // Always clear local state and storage regardless of Supabase call success
      setProfile(null);
      setUser(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to signin page if not already there
      if (!window.location.pathname.includes('/signin')) {
        window.location.href = '/signin';
      }
    } catch (error: any) {
      // Don't show error for session not found - just clean up and redirect
      if (error.message.includes('session not found') || error.message.includes('session missing')) {
        setProfile(null);
        setUser(null);
        setSession(null);
        localStorage.clear();
        sessionStorage.clear();
        if (!window.location.pathname.includes('/signin')) {
          window.location.href = '/signin';
        }
      } else {
        toast({
          title: "Error",
          description: "There was an issue signing out. Please try again.",
          variant: "destructive"
        });
      }
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

  const handleSessionTimeout = () => {
    toast({
      title: "Session Expired",
      description: "You have been signed out due to inactivity.",
      variant: "destructive"
    });
    signOut('timeout');
  };

  const handleSessionWarning = () => {
    setIsSessionWarningOpen(true);
  };

  const extendSession = () => {
    setIsSessionWarningOpen(false);
    // Timer will be reset automatically by activity detection
  };

  // Session timeout hook
  useSessionTimeout({
    timeoutMinutes: 10,
    warningMinutes: 1,
    onTimeout: handleSessionTimeout,
    onWarning: handleSessionWarning,
    isAuthenticated: !!user
  });

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isSubmitting,
    loginError,
    isForgotPasswordOpen,
    resetSent,
    isSessionWarningOpen,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    setForgotPasswordOpen,
    clearError,
    extendSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionWarningDialog
        isOpen={isSessionWarningOpen}
        onExtendSession={extendSession}
        onSignOut={signOut}
        warningSeconds={60}
      />
    </AuthContext.Provider>
  );
};