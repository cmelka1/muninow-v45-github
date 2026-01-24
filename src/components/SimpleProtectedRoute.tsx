import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAccountType?: string | string[];
  requireCustomerId?: boolean;
  exactMatch?: boolean;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({
  children,
  redirectTo = '/signin',
  requireAccountType,
  requireCustomerId = false,
  exactMatch = false
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
    
    // Check if user's account type matches any allowed type
    // First check the new roles array if it exists
    let hasAccess = false;
    
    if (profile.roles && profile.roles.length > 0) {
      hasAccess = allowedTypes.some(allowedType => 
        profile.roles!.includes(allowedType)
      );
    } 
    
    // If no access from roles (or no roles), fall back to account_type (legacy)
    if (!hasAccess) {
      hasAccess = allowedTypes.some(allowedType => {
        if (exactMatch) {
          return userAccountType === allowedType;
        }
        return userAccountType === allowedType || userAccountType.startsWith(allowedType);
      });
    }
    
    if (!hasAccess) {
      console.log('Access denied - invalid role:', { userAccountType, allowedTypes });
      // STOP THE LOOP: Do not redirect to /dashboard if we are already there or if dashboard requires the role we don't have.
      // Instead, show an "Access Denied" state to break the cycle.
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              Your account type ({userAccountType}) does not have permission to view this page.
              Required: {allowedTypes.join(', ')}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              This usually happens if your account setup is incomplete. Please log out and sign in again to refresh your permissions.
            </p>
            <button 
              onClick={() => {
                // Hard logout to clear everything
                localStorage.clear();
                window.location.href = '/signin';
              }}
              className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90 transition"
            >
              Log Out & Try Again
            </button>
          </div>
        </div>
      );
    }
  } else if (requireAccountType && !profile) {
    return <Navigate to="/signin" replace />;
  }

  if (requireCustomerId && (!profile || !profile.customer_id)) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
};