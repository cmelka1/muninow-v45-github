import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface UseUserPaymentHistoryParams extends PaginationParams {
  userId: string;
}

export const useUserPaymentHistory = (params: UseUserPaymentHistoryParams) => {
  const { profile } = useAuth();
  const { userId, page = 1, pageSize = 5 } = params;

  return useQuery({
    queryKey: ['user-payment-history', userId, page, pageSize],
    queryFn: async () => {
      if (!userId || !profile?.customer_id) return { data: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('payment_history')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching user payment history:', error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
    enabled: !!(userId && profile?.customer_id && profile?.account_type === 'municipal'),
  });
};