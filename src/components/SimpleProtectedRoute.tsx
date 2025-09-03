import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAccountType?: 'resident' | 'municipal' | 'superadmin';
  requireCustomerId?: boolean;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({
  children,
  redirectTo = '/signin',
  requireAccountType,
  requireCustomerId = false
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

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requireAccountType && (!profile || profile.account_type !== requireAccountType)) {
    return <Navigate to="/signin" replace />;
  }

  if (requireCustomerId && (!profile || !profile.customer_id)) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};