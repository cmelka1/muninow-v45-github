import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentHistoryFilters } from '@/components/PaymentHistoryFilter';

interface PaginationParams {
  page?: number;
  pageSize?: number;
  filters?: PaymentHistoryFilters;
}

export const usePaymentHistory = (params?: PaginationParams) => {
  const { user } = useAuth();
  const { page = 1, pageSize = 5, filters = {} } = params || {};

  return useQuery({
    queryKey: ['payment-history', user?.id, page, pageSize, filters],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('payment_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      if (filters.paymentMethod) {
        if (filters.paymentMethod === 'Google Pay') {
          query = query.eq('payment_type', 'GOOGLE_PAY');
        } else if (filters.paymentMethod === 'Apple Pay') {
          query = query.eq('payment_type', 'APPLE_PAY');
        } else if (filters.paymentMethod === 'Bank Account') {
          query = query.eq('payment_type', 'BANK_ACCOUNT');
        } else if (filters.paymentMethod === 'Card') {
          query = query.eq('payment_type', 'PAYMENT_CARD');
        }
      }

      if (filters.paymentDateRange) {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.paymentDateRange) {
          case 'last_7_days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last_90_days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // No date filter
        }
        
        if (filters.paymentDateRange !== 'all_time') {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      if (filters.amountRange) {
        switch (filters.amountRange) {
          case '0-100':
            query = query.gte('total_amount_cents', 0).lte('total_amount_cents', 10000);
            break;
          case '101-500':
            query = query.gte('total_amount_cents', 10100).lte('total_amount_cents', 50000);
            break;
          case '501-1000':
            query = query.gte('total_amount_cents', 50100).lte('total_amount_cents', 100000);
            break;
          case '1000+':
            query = query.gte('total_amount_cents', 100001);
            break;
        }
      }

      const { data: transactions, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching payment transactions:', error);
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

      // Apply merchant and category filters after enrichment
      let filteredData = enrichedData;
      
      if (filters.merchant) {
        filteredData = filteredData.filter(t => t.merchant_name === filters.merchant);
      }
      
      if (filters.category) {
        filteredData = filteredData.filter(t => t.category === filters.category);
      }

      return { data: filteredData, count: count || 0 };
    },
    enabled: !!user?.id,
  });
};