import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MunicipalSearchFilters {
  accountType?: 'resident' | 'business';
  merchantId?: string;
  category?: string;
  subcategory?: string;
  amountRange?: string;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface UseMunicipalSearchParams extends PaginationParams {
  searchTerm?: string;
  filters?: MunicipalSearchFilters;
}

export interface SearchResult {
  user_id: string;
  profile_id: string;
  account_type: string;
  first_name: string | null;
  last_name: string | null;
  business_legal_name: string | null;
  email: string;
  phone: string | null;
  street_address: string | null;
  apt_number: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  permit_count?: number;
  license_count?: number;
  service_application_count?: number;
  tax_submission_count?: number;
}

/**
 * Municipal Search Hook
 * 
 * Searches municipal users and their associated services (permits, licenses, taxes, applications).
 * This feature was refactored to remove the deprecated bill payment system.
 */
export const useMunicipalSearch = (params?: UseMunicipalSearchParams) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['municipal-search', profile?.customer_id, params],
    queryFn: async () => {
      if (!profile?.customer_id) {
        return { data: [], count: 0 };
      }

      // Search users in this municipality with their service counts
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('customer_id', profile.customer_id)
        .ilike('email', `%${params?.searchTerm || ''}%`)
        .range(
          ((params?.page || 1) - 1) * (params?.pageSize || 10),
          (params?.page || 1) * (params?.pageSize || 10) - 1
        );

      if (error) throw error;

      return { 
        data: (data || []).map(user => ({
          ...user,
          user_id: user.id,
          profile_id: user.id,
        })), 
        count: count || 0 
      };
    },
    enabled: !!profile?.customer_id && !!profile.account_type && 
             (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal')),
  });
};

export const useMunicipalSearchFilterOptions = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['municipal-search-filter-options', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) {
        return { merchants: [], categories: [], subcategories: [] };
      }

      // Get merchants for this municipality
      const { data: merchants } = await supabase
        .from('merchants')
        .select('id, merchant_name')
        .eq('customer_id', profile.customer_id);

      return {
        merchants: merchants || [],
        categories: [],
        subcategories: []
      };
    },
    enabled: !!profile?.customer_id && !!profile.account_type && 
             (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal')),
  });
};
