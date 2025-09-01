import { useAuth } from '@/contexts/SimpleAuthContext';

interface UseUserRoleReturn {
  hasRole: (role: string) => boolean;
  isLoading: boolean;
  error: string | null;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { profile, isLoading } = useAuth();

  const hasRole = (role: string): boolean => {
    if (!profile) return false;
    
    // Map old role system to new account_type system
    const roleMapping: Record<string, string[]> = {
      'residentUser': ['resident'],
      'residentAdmin': ['resident'],
      'superAdmin': ['superadmin'],
      'municipalUser': ['municipal'],
      'municipalAdmin': ['municipal']
    };
    
    const allowedAccountTypes = roleMapping[role] || [];
    return allowedAccountTypes.includes(profile.account_type);
  };

  return { 
    hasRole, 
    isLoading, 
    error: null 
  };
};