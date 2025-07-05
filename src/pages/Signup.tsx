import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SignupForm } from '@/components/auth/SignupForm';
import { PreloginHeader } from '@/components/layout/PreloginHeader';
import { PreloginFooter } from '@/components/layout/PreloginFooter';

const Signup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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