
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface BillFilters {
  vendor?: string;
  category?: string;
  paymentStatus?: string;
  dueDateRange?: string;
  amountRange?: string;
}

interface UseBillsParams extends PaginationParams {
  filters?: BillFilters;
}

export const useBills = (params?: UseBillsParams) => {
  const { user } = useAuth();
  const { page = 1, pageSize = 5, filters = {} } = params || {};

  return useQuery({
    queryKey: ['master-bills', user?.id, page, pageSize, filters],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('master_bills')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .not('bill_status', 'eq', 'paid');

      // Apply filters
      if (filters.vendor) {
        query = query.eq('merchant_name', filters.vendor);
      }
      
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.paymentStatus) {
        query = query.eq('bill_status', filters.paymentStatus as any);
      }
      
      if (filters.dueDateRange) {
        const now = new Date();
        switch (filters.dueDateRange) {
          case 'next_7_days':
            const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            query = query.gte('due_date', now.toISOString()).lte('due_date', next7Days.toISOString());
            break;
          case 'next_30_days':
            const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            query = query.gte('due_date', now.toISOString()).lte('due_date', next30Days.toISOString());
            break;
          case 'past_due':
            query = query.lt('due_date', now.toISOString());
            break;
          // 'all_time' doesn't add any filter
        }
      }
      
      if (filters.amountRange) {
        switch (filters.amountRange) {
          case '0-100':
            query = query.gte('amount_due_cents', 0).lte('amount_due_cents', 10000);
            break;
          case '101-500':
            query = query.gte('amount_due_cents', 10100).lte('amount_due_cents', 50000);
            break;
          case '501-1000':
            query = query.gte('amount_due_cents', 50100).lte('amount_due_cents', 100000);
            break;
          case '1000+':
            query = query.gte('amount_due_cents', 100000);
            break;
        }
      }

      const { data, error, count } = await query
        .order('due_date', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Error fetching bills:', error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.id,
  });
};
