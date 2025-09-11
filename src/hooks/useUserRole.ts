import { useAuth } from '@/contexts/SimpleAuthContext';

interface UseUserRoleReturn {
  hasRole: (role: string) => boolean;
  isMunicipalUser: () => boolean;
  isResidentUser: () => boolean;
  isBusinessUser: () => boolean;
  isLoading: boolean;
  error: string | null;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { profile, isLoading } = useAuth();

  const hasRole = (role: string): boolean => {
    if (!profile) return false;
    
    // Map role names to actual account_type values
    const roleMapping: Record<string, string[]> = {
      'residentadmin': ['residentadmin'],
      'businessadmin': ['businessadmin'],
      'municipaladmin': ['municipaladmin'],
      'superadmin': ['superadmin'],
      // Support legacy camelCase for backward compatibility
      'residentAdmin': ['residentadmin'],
      'businessAdmin': ['businessadmin'],
      'municipalAdmin': ['municipaladmin'],
      'superAdmin': ['superadmin'],
      // Support role families
      'municipal': ['municipaladmin'],
      'resident': ['residentadmin'],
      'business': ['businessadmin']
    };
    
    const allowedAccountTypes = roleMapping[role] || [];
    return allowedAccountTypes.includes(profile.account_type);
  };

  const isMunicipalUser = (): boolean => {
    if (!profile?.account_type) return false;
    return profile.account_type === 'municipaladmin';
  };

  const isResidentUser = (): boolean => {
    if (!profile?.account_type) return false;
    return profile.account_type === 'residentadmin';
  };

  const isBusinessUser = (): boolean => {
    if (!profile?.account_type) return false;
    return profile.account_type === 'businessadmin';
  };

  return { 
    hasRole, 
    isMunicipalUser,
    isResidentUser,
    isBusinessUser,
    isLoading, 
    error: null 
  };
};