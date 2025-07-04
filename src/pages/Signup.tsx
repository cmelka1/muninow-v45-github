import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SignupForm } from '@/components/auth/SignupForm';

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
    navigate('/auth');
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <SignupForm onBack={handleBackToSignIn} />
    </div>
  );
};

export default Signup;