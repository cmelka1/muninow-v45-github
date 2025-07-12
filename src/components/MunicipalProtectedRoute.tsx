import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface MunicipalProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const MunicipalProtectedRoute: React.FC<MunicipalProtectedRouteProps> = ({
  children,
  redirectTo = '/auth'
}) => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated and has municipal account type
  if (!user || !profile || profile.account_type !== 'municipal') {
    return <Navigate to={redirectTo} replace />;
  }

  // Check if municipal user has valid customer_id assignment
  if (!profile.customer_id) {
    return <Navigate to="/municipal/setup" replace />;
  }

  return <>{children}</>;
};