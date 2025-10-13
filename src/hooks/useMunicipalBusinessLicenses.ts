import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryPerformance, performanceUtils } from './useQueryPerformance';

export interface MunicipalBusinessLicense {
  id: string;
  license_number: string;
  business_legal_name: string;
  owner_first_name: string;
  owner_last_name: string;
  application_status: string;
  total_amount_cents: number;
  base_amount_cents: number;
  service_fee_cents: number;
  created_at: string;
  submitted_at: string | null;
  customer_id: string;
  user_id: string;
  license_type_id: string | null;
  business_type: string;
  business_description: string | null;
}

interface UseMunicipalBusinessLicensesParams {
  filters?: {
    licenseType?: string;
    status?: string;
    dateRange?: string;
    feeRange?: string;
  };
  page?: number;
  pageSize?: number;
}

export const useMunicipalBusinessLicenses = ({ filters = {}, page = 1, pageSize = 10 }: UseMunicipalBusinessLicensesParams = {}) => {
  const { profile } = useAuth();
  const performance = useQueryPerformance();

  return useQuery({
    queryKey: ['municipal-business-licenses', filters, page, pageSize, profile?.customer_id, profile?.account_type],
    queryFn: async () => {
      const queryStart = performanceUtils.startQuery('municipal-business-licenses', {
        filters,
        page,
        pageSize,
        customerType: profile?.account_type,
        customerId: profile?.customer_id
      });
      
      if (!profile) throw new Error('User profile not available');
      
      // Ensure this is only used by municipal users
      const isMunicipal = profile.account_type === 'municipal' || profile.account_type.startsWith('municipal');
      if (!isMunicipal) {
        throw new Error('Access denied: Municipal users only');
      }

      // Start building the query
      let query = supabase
        .from('business_license_applications')
        .select(`
          id,
          license_number,
          business_legal_name,
          owner_first_name,
          owner_last_name,
          application_status,
          total_amount_cents,
          base_amount_cents,
          service_fee_cents,
          created_at,
          submitted_at,
          customer_id,
          user_id,
          license_type_id,
          business_type,
          business_description
        `, { count: 'exact' });

      // Only show licenses for this municipal customer
      query = query.eq('customer_id', profile.customer_id);

      // Apply filters
      if (filters.licenseType) {
        query = query.eq('license_type_id', filters.licenseType);
      }

      if (filters.status && filters.status !== 'all') {
        // Apply specific status filter only when a specific status is selected
        query = query.eq('application_status', filters.status as any);
      }
      // When status is 'all' or undefined, show all statuses including issued

      if (filters.dateRange) {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.dateRange) {
          case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last_3_months':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'last_6_months':
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
          case 'last_year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // All time
        }
        
        if (filters.dateRange !== 'all_time') {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      if (filters.feeRange) {
        switch (filters.feeRange) {
          case '0-50':
            query = query.lte('total_amount_cents', 5000); // $50 in cents
            break;
          case '51-100':
            query = query.gte('total_amount_cents', 5001).lte('total_amount_cents', 10000);
            break;
          case '101-250':
            query = query.gte('total_amount_cents', 10001).lte('total_amount_cents', 25000);
            break;
          case '251-500':
            query = query.gte('total_amount_cents', 25001).lte('total_amount_cents', 50000);
            break;
          case '500+':
            query = query.gte('total_amount_cents', 50001);
            break;
        }
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching municipal business licenses:', error);
        performanceUtils.endQuery('municipal-business-licenses', queryStart, 0, error.message);
        performance.error('Municipal business licenses query failed', {
          error: error.message,
          filters,
          page,
          pageSize
        });
        throw error;
      }

      const result = {
        licenses: data as MunicipalBusinessLicense[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        pageSize
      };

      performanceUtils.endQuery('municipal-business-licenses', queryStart, data?.length || 0);
      performance.log('Municipal business licenses query completed', {
        resultCount: data?.length || 0,
        totalCount: count || 0,
        filters,
        page,
        pageSize,
        duration: `${(window.performance.now() - queryStart).toFixed(2)}ms`
      });

      return result;
    },
    enabled: !!profile && !!profile.account_type && (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal'))
  });
};