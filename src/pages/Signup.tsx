import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SignupForm } from '@/components/auth/SignupForm';
import { PreloginHeader } from '@/components/layout/PreloginHeader';
import { PreloginFooter } from '@/components/layout/PreloginFooter';

const Signup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSessionCleared, setIsSessionCleared] = useState(false);

  // Redirect authenticated users to dashboard instead of logging them out
  useEffect(() => {
    const checkAuthentication = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && user) {
        // User is already logged in, redirect to dashboard
        console.log('User already authenticated, redirecting to dashboard');
        navigate('/dashboard');
      }
    };
    
    checkAuthentication();
  }, [user, navigate]);

  // Redirect authenticated users
  useEffect(() => {
    if (user && isSessionCleared) {
      navigate('/dashboard');
    }
  }, [user, navigate, isSessionCleared]);

  const handleBackToSignIn = () => {
    navigate('/signin');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PreloginHeader />
      <main className="flex-1 gradient-bg flex items-center justify-center p-4">
        <SignupForm onBack={handleBackToSignIn} />
      </main>
      <PreloginFooter />
    </div>
  );
};
export default Signup;