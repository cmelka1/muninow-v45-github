import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PermitStatus } from './usePermitWorkflow';

export interface Permit {
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

interface UsePermitsParams {
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

export const usePermits = ({ filters = {}, page = 1, pageSize = 10 }: UsePermitsParams = {}) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['permits', filters, page, pageSize, profile?.customer_id],
    queryFn: async () => {
      if (!profile) throw new Error('User profile not available');

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

      // Apply customer filter based on user type
      if (profile.account_type === 'municipal') {
        query = query.eq('customer_id', profile.customer_id);
      } else {
        query = query.eq('user_id', profile.id);
      }

      // Apply filters
      if (filters.permitType) {
        query = query.eq('permit_type', filters.permitType);
      }

      if (filters.status) {
        query = query.eq('application_status', filters.status as PermitStatus);
      }

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
        console.error('Error fetching permits:', error);
        throw error;
      }

      return {
        permits: data as Permit[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        pageSize
      };
    },
    enabled: !!profile
  });
};