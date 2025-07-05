import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface PaymentHistoryFilters {
  vendor?: string;
  category?: string;
  paymentMethod?: string;
  dateRange?: string;
  amountRange?: string;
}

interface UsePaymentRecordsParams extends PaginationParams {
  filters?: PaymentHistoryFilters;
}

export const usePaymentRecords = (params?: UsePaymentRecordsParams) => {
  const { user } = useAuth();
  const { page = 1, pageSize = 5, filters = {} } = params || {};

  return useQuery({
    queryKey: ['payment-records', user?.id, page, pageSize, filters],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('payment_records')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Apply filters
      if (filters.vendor) {
        query = query.eq('vendor', filters.vendor);
      }
      
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.paymentMethod) {
        query = query.eq('method_name', filters.paymentMethod);
      }
      
      if (filters.dateRange) {
        const now = new Date();
        switch (filters.dateRange) {
          case 'last_7_days':
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            query = query.gte('processed_at', last7Days.toISOString());
            break;
          case 'last_30_days':
            const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            query = query.gte('processed_at', last30Days.toISOString());
            break;
          case 'last_90_days':
            const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            query = query.gte('processed_at', last90Days.toISOString());
            break;
          // 'all_time' doesn't add any filter
        }
      }
      
      if (filters.amountRange) {
        switch (filters.amountRange) {
          case '0-100':
            query = query.gte('amount_cents', 0).lte('amount_cents', 10000); // $100 in cents
            break;
          case '101-500':
            query = query.gte('amount_cents', 10100).lte('amount_cents', 50000); // $101-$500 in cents
            break;
          case '501-1000':
            query = query.gte('amount_cents', 50100).lte('amount_cents', 100000); // $501-$1000 in cents
            break;
          case '1000+':
            query = query.gte('amount_cents', 100000); // $1000+ in cents
            break;
        }
      }

      const { data, error, count } = await query
        .order('processed_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching payment records:', error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.id,
  });
};