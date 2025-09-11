import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryPerformance, performanceUtils } from './useQueryPerformance';
import type { PermitStatus } from './usePermitWorkflow';

export interface MunicipalPermit {
  permit_id: string;
  permit_number: string;
  permit_type: string;
  application_status: string;
  applicant_full_name: string;
  property_address: string;
  total_amount_cents: number;
  estimated_construction_value_cents: number;
  created_at: string;
  submitted_at: string | null;
  customer_id: string;
  merchant_name: string | null;
  user_id: string;
}

interface UseMunicipalPermitsParams {
  filters?: {
    permitType?: string;
    status?: string;
    dateRange?: string;
    feeRange?: string;
    department?: string;
  };
  page?: number;
  pageSize?: number;
}

export const useMunicipalPermits = ({ filters = {}, page = 1, pageSize = 10 }: UseMunicipalPermitsParams = {}) => {
  const { profile } = useAuth();
  const performance = useQueryPerformance();

  return useQuery({
    queryKey: ['municipal-permits', filters, page, pageSize, profile?.customer_id, profile?.account_type],
    queryFn: async () => {
      const queryStart = performanceUtils.startQuery('municipal-permits', {
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
        .from('permit_applications')
        .select(`
          permit_id,
          permit_number,
          permit_type,
          application_status,
          applicant_full_name,
          property_address,
          total_amount_cents,
          estimated_construction_value_cents,
          created_at,
          submitted_at,
          customer_id,
          merchant_name,
          user_id
        `, { count: 'exact' });

      // Only show permits for this municipal customer
      query = query.eq('customer_id', profile.customer_id);

      // Apply filters
      if (filters.permitType) {
        query = query.eq('permit_type', filters.permitType);
      }

      if (filters.status && filters.status !== 'all') {
        // Apply specific status filter only when a specific status is selected
        query = query.eq('application_status', filters.status as PermitStatus);
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
          case '0-100':
            query = query.lte('total_amount_cents', 10000); // $100 in cents
            break;
          case '101-500':
            query = query.gte('total_amount_cents', 10001).lte('total_amount_cents', 50000);
            break;
          case '501-1000':
            query = query.gte('total_amount_cents', 50001).lte('total_amount_cents', 100000);
            break;
          case '1000+':
            query = query.gte('total_amount_cents', 100001);
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
        console.error('Error fetching municipal permits:', error);
        performanceUtils.endQuery('municipal-permits', queryStart, 0, error.message);
        performance.error('Municipal permits query failed', {
          error: error.message,
          filters,
          page,
          pageSize
        });
        throw error;
      }

      const result = {
        permits: data as MunicipalPermit[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        pageSize
      };

      performanceUtils.endQuery('municipal-permits', queryStart, data?.length || 0);
      performance.log('Municipal permits query completed', {
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