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
    
    // Map role names to normalized account_type values
    const roleMapping: Record<string, string[]> = {
      'residentuser': ['resident', 'residentuser'],
      'residentadmin': ['residentadmin'],
      'superadmin': ['superadmin'],
      'municipaluser': ['municipal', 'municipaluser'],
      'municipaladmin': ['municipaladmin'],
      // Support legacy camelCase for backward compatibility
      'residentUser': ['resident', 'residentuser'],
      'residentAdmin': ['residentadmin'],
      'superAdmin': ['superadmin'],
      'municipalUser': ['municipal', 'municipaluser'],
      'municipalAdmin': ['municipaladmin'],
      // Support role families
      'municipal': ['municipal', 'municipaluser', 'municipaladmin'],
      'resident': ['resident', 'residentuser', 'residentadmin'],
      'business': ['business', 'businessuser', 'businessadmin']
    };
    
    const allowedAccountTypes = roleMapping[role] || [];
    return allowedAccountTypes.includes(profile.account_type);
  };

  const isMunicipalUser = (): boolean => {
    if (!profile?.account_type) return false;
    return ['municipal', 'municipaluser', 'municipaladmin'].includes(profile.account_type);
  };

  const isResidentUser = (): boolean => {
    if (!profile?.account_type) return false;
    return ['resident', 'residentuser', 'residentadmin'].includes(profile.account_type);
  };

  const isBusinessUser = (): boolean => {
    if (!profile?.account_type) return false;
    return ['business', 'businessuser', 'businessadmin'].includes(profile.account_type);
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