import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface TaxSubmissionFilters {
  taxType?: string;
  paymentStatus?: string;
  taxYear?: number;
  periodRange?: string;
}

interface UseMunicipalTaxSubmissionsParams extends PaginationParams {
  filters?: TaxSubmissionFilters;
}

export const useMunicipalTaxSubmissions = (params?: UseMunicipalTaxSubmissionsParams) => {
  const { profile } = useAuth();
  const { page = 1, pageSize = 10, filters = {} } = params || {};

  return useQuery({
    queryKey: ['municipal-tax-submissions', profile?.customer_id, page, pageSize, filters],
    queryFn: async () => {
      const isMunicipal = profile?.account_type && (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal'));
      if (!profile?.customer_id || !isMunicipal) {
        return { data: [], count: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('tax_submissions')
        .select('*', { count: 'exact' })
        .eq('customer_id', profile.customer_id);

      // Apply filters
      if (filters.taxType) {
        query = query.eq('tax_type', filters.taxType);
      }
      
      if (filters.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }
      
      if (filters.taxYear) {
        query = query.eq('tax_year', filters.taxYear);
      }
      
      if (filters.periodRange) {
        const now = new Date();
        switch (filters.periodRange) {
          case 'current_year':
            const currentYear = now.getFullYear();
            const yearStart = new Date(currentYear, 0, 1);
            const yearEnd = new Date(currentYear, 11, 31);
            query = query.gte('tax_period_start', yearStart.toISOString()).lte('tax_period_end', yearEnd.toISOString());
            break;
          case 'last_year':
            const lastYear = now.getFullYear() - 1;
            const lastYearStart = new Date(lastYear, 0, 1);
            const lastYearEnd = new Date(lastYear, 11, 31);
            query = query.gte('tax_period_start', lastYearStart.toISOString()).lte('tax_period_end', lastYearEnd.toISOString());
            break;
          case 'last_6_months':
            const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
            query = query.gte('tax_period_start', sixMonthsAgo.toISOString());
            break;
          // 'all_time' doesn't add any filter
        }
      }

      const { data, error, count } = await query
        .order('submission_date', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching municipal tax submissions:', error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    },
    enabled: !!profile?.customer_id && !!profile.account_type && (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal')),
  });
};