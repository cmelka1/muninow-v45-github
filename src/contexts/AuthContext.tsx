import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useCrossTabSession } from '@/hooks/useCrossTabSession';
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
  const [authError, setAuthError] = useState<string | null>(null);

  // Cross-tab session management with error handling
  const { clearSession } = useCrossTabSession({
    onExternalSessionChange: (newSessionId) => {
      try {
        if (newSessionId && user) {
          setLogoutReason('external');
          toast({
            title: "Signed out",
            description: "You've been signed out because another user logged in.",
            variant: "destructive"
          });
          signOut('external');
        }
      } catch (error) {
        console.error('Error handling external session change:', error);
      }
    }
  });

  // Load user profile with enhanced error handling
  const loadProfile = async (userId: string) => {
    const timeoutId = setTimeout(() => {
      console.warn('Profile loading timed out after 10 seconds');
      setIsLoading(false);
    }, 10000);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      console.error('Unexpected error loading profile:', error);
      setIsLoading(false);
    }
  };

  // Initialize authentication state with comprehensive error handling
  useEffect(() => {
    let currentUserId: string | null = null;
    let subscription: any = null;
    
    const initializeAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const authListener = supabase.auth.onAuthStateChange(
          (event, session) => {
            try {
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
                // Load profile for authenticated user
                setTimeout(() => {
                  loadProfile(session.user.id);
                }, 0);
              } else {
                // Clear profile and state when user signs out
                setProfile(null);
                setIsLoading(false);
                // Don't automatically redirect - let individual routes handle protection
              }
            } catch (error) {
              console.error('Error in auth state change handler:', error);
              setAuthError('Authentication error occurred');
              setIsLoading(false);
            }
          }
        );

        subscription = authListener.data.subscription;

        // THEN check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthError('Failed to get session');
          setIsLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        setAuthError('Failed to initialize authentication');
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
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
      console.error('Sign in error:', error);
      setLoginError(error.message || 'An unexpected error occurred');
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
      console.error('Sign up error:', error);
      setLoginError(error.message || 'An unexpected error occurred');
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
      clearSession();
      localStorage.clear();
      sessionStorage.clear();
      
      // Only redirect to signin if user manually signed out, not for automatic timeouts
      if (reason === 'user' && !window.location.pathname.includes('/signin')) {
        window.location.href = '/signin';
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Don't show error for session not found - just clean up and redirect
      if (error.message.includes('session not found') || error.message.includes('session missing')) {
        setProfile(null);
        setUser(null);
        setSession(null);
        localStorage.clear();
        sessionStorage.clear();
        // Only redirect to signin if user manually signed out, not for automatic timeouts
        if (reason === 'user' && !window.location.pathname.includes('/signin')) {
          window.location.href = '/signin';
        }
      } else {
        clearSession();
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
    setAuthError(null);
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

  // Session timeout hook with error handling
  useSessionTimeout({
    timeoutMinutes: 10,
    warningMinutes: 1,
    onTimeout: handleSessionTimeout,
    onWarning: handleSessionWarning,
    isAuthenticated: !!user
  });

  // If there's a critical auth error, show error state
  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Authentication Error
          </h1>
          <p className="text-muted-foreground mb-6">
            {authError}
          </p>
          <button
            onClick={() => {
              setAuthError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
