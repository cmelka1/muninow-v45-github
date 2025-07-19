
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface UseUserBillsParams extends PaginationParams {
  userId: string;
}

export const useUserBills = (params: UseUserBillsParams) => {
  const { profile } = useAuth();
  const { userId, page = 1, pageSize = 5 } = params;

  return useQuery({
    queryKey: ['user-bills', userId, page, pageSize],
    queryFn: async () => {
      if (!userId || !profile?.customer_id) return { data: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('master_bills')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('customer_id', profile.customer_id)
        .not('bill_status', 'eq', 'paid')
        .order('due_date', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Error fetching user bills:', error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
    enabled: !!(userId && profile?.customer_id && profile?.account_type === 'municipal'),
  });
};
