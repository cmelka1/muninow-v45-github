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

      const { data: transactions, error, count } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching user payment history:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) {
        return { data: [], count: count || 0 };
      }

      // Get unique merchant IDs from transactions
      const merchantIds = [...new Set(transactions.map(t => t.merchant_id).filter(Boolean))];
      
      // Fetch merchant data for these IDs
      const { data: merchants } = await supabase
        .from('merchants')
        .select('id, merchant_name, category, subcategory')
        .in('id', merchantIds);

      // Create a map for quick lookups
      const merchantMap = new Map(merchants?.map(m => [m.id, m]) || []);

      // Merge transaction data with merchant data
      const enrichedData = transactions.map(transaction => ({
        ...transaction,
        merchant_name: merchantMap.get(transaction.merchant_id)?.merchant_name || 'Unknown Merchant',
        category: merchantMap.get(transaction.merchant_id)?.category || null,
        subcategory: merchantMap.get(transaction.merchant_id)?.subcategory || null,
      }));

      return { data: enrichedData, count: count || 0 };
    },
    enabled: !!(userId && profile?.customer_id && profile?.account_type === 'municipal'),
  });
};