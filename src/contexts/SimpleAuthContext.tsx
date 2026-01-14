import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRoleResponse } from '@/types/rpc-types';

interface Profile {
  user_id: string;
  account_type: string;
  customer_id?: string;
  roles?: string[];
  [key: string]: string | number | boolean | null | string[] | undefined;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.log('No userId provided to loadProfile');
      return false;
    }

    setProfileLoading(true);
    console.log('Loading profile for user:', userId);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        setError('Failed to load user profile');
        return false;
      }

      if (data) {
        console.log('Profile loaded successfully:', data);
        setProfile({
          user_id: data.id,
          account_type: data.account_type || 'resident',
          customer_id: data.customer_id,
          ...data
        });

        // Load roles properly
        try {
          const { data: roleData, error: roleError } = await supabase.rpc('get_user_roles', {
             _user_id: userId
          });
          
          if (!roleError && roleData) {
            console.log('Roles loaded:', roleData);
            const roles = roleData.map((r: UserRoleResponse) => r.role);
            setProfile(prev => prev ? ({ ...prev, roles }) : null);
          }
        } catch (e) {
          console.error('Error fetching roles:', e);
        }

        setError(null);
        return true;
      } else {
        console.log('No profile found for user, creating default profile data');
        setProfile({
          user_id: userId,
          account_type: 'resident',
        });
        return true;
      }
    } catch (err) {
      console.error('Profile loading error:', err);
      setError('Profile loading failed');
      return false;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking auth state change
          setTimeout(async () => {
            const profileLoaded = await loadProfile(session.user.id);
            console.log('Profile loading completed:', profileLoaded);
            setIsLoading(false);
          }, 0);
        } else {
          console.log('No user, clearing profile and setting loading to false');
          setProfile(null);
          setProfileLoading(false);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.id);
        
        // Don't duplicate the auth state change logic here
        // The onAuthStateChange will handle the session
        if (!session?.user) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Authentication initialization failed');
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  // Add session refresh on window focus to prevent expiration during payments
  useEffect(() => {
    const handleFocus = async () => {
      if (!user || !session) return;
      
      const expiresAt = session.expires_at || 0;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - currentTime;
      
      // Refresh if session expires in less than 10 minutes
      if (timeUntilExpiry < 600) {
        console.log('Session expiring soon, refreshing on focus...');
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          console.log('Session refreshed on focus');
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, session]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // State will be cleared by onAuthStateChange
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};