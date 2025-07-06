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
      console.log('🔍 Starting customer search query...');
      
      // Check authentication status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Auth session:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        sessionError: sessionError?.message 
      });

      // Check user roles
      if (session?.user?.id) {
        const { data: userRoles, error: rolesError } = await supabase.rpc('get_user_roles', {
          _user_id: session.user.id
        });
        console.log('👤 User roles:', { userRoles, rolesError: rolesError?.message });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      console.log('📊 Query params:', { from, to, searchQuery });

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

      console.log('📥 Query result:', { 
        dataCount: data?.length || 0, 
        totalCount: count,
        error: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint,
        errorCode: error?.code
      });

      if (error) {
        console.error('❌ Error fetching customers:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
  });
};