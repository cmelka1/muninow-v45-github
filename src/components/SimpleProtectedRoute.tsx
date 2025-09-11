import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAccountType?: string | string[];
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

  if (requireAccountType && profile) {
    const allowedTypes = Array.isArray(requireAccountType) ? requireAccountType : [requireAccountType];
    const userAccountType = profile.account_type;
    
    // Check if user's account type matches any allowed type or starts with allowed prefix
    const hasAccess = allowedTypes.some(allowedType => 
      userAccountType === allowedType || userAccountType.startsWith(allowedType)
    );
    
    if (!hasAccess) {
      console.log('Access denied - redirecting to dashboard:', { userAccountType, allowedTypes });
      return <Navigate to="/dashboard" replace />;
    }
  } else if (requireAccountType && !profile) {
    return <Navigate to="/signin" replace />;
  }

  if (requireCustomerId && (!profile || !profile.customer_id)) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};