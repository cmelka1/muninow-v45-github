import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface UseCustomerSearchParams extends PaginationParams {
  searchQuery?: string;
}

export const useCustomerSearch = (params?: UseCustomerSearchParams) => {
  const { page = 1, pageSize = 10, searchQuery = '' } = params || {};

  return useQuery({
    queryKey: ['customer-search', page, pageSize, searchQuery],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      // If there's a search query, search both business_name and doing_business_as
      if (searchQuery.trim()) {
        query = query.or(`business_name.ilike.%${searchQuery}%,doing_business_as.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('business_name', { ascending: true })
        .range(from, to);

      if (error) {
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
  });
};