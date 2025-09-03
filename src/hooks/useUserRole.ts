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
    
    // Map role names to normalized account_type values
    const roleMapping: Record<string, string[]> = {
      'residentuser': ['resident'],
      'residentadmin': ['resident'],
      'superadmin': ['superadmin'],
      'municipaluser': ['municipal'],
      'municipaladmin': ['municipal'],
      // Support legacy camelCase for backward compatibility
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