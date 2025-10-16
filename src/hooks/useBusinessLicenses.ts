import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessLicenseFilters } from '@/components/BusinessLicenseFilter';

export interface BusinessLicense {
  id: string;
  license_number: string;
  business_legal_name: string;
  business_type: string;
  business_street_address: string;
  owner_first_name: string;
  owner_last_name: string;
  application_status: string;
  base_amount_cents: number;
  total_fee_cents: number;
  submitted_at?: string;
  approved_at?: string;
  issued_at?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  original_issue_date?: string;
  parent_license_id?: string;
  is_renewal?: boolean;
  renewal_generation?: number;
  renewal_status?: string;
}

interface UseBusinessLicensesParams {
  filters?: BusinessLicenseFilters;
  page?: number;
  pageSize?: number;
}

export const useBusinessLicenses = ({ filters = {}, page = 1, pageSize = 10 }: UseBusinessLicensesParams = {}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['business-licenses', filters, page, pageSize, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User must be authenticated');

      let query = supabase
        .from('business_license_applications')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (filters.status) {
        query = query.eq('application_status', filters.status as any);
      }

      if (filters.licenseType) {
        query = query.eq('business_type', filters.licenseType);
      }

      if (filters.dateRange && filters.dateRange !== 'all_time') {
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
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      if (filters.feeRange) {
        switch (filters.feeRange) {
          case '0-50':
            query = query.lte('base_amount_cents', 5000);
            break;
          case '51-100':
            query = query.gt('base_amount_cents', 5000).lte('base_amount_cents', 10000);
            break;
          case '101-250':
            query = query.gt('base_amount_cents', 10000).lte('base_amount_cents', 25000);
            break;
          case '251-500':
            query = query.gt('base_amount_cents', 25000).lte('base_amount_cents', 50000);
            break;
          case '500+':
            query = query.gt('base_amount_cents', 50000);
            break;
        }
      }

      if (filters.renewalStatus) {
        query = query.eq('renewal_status', filters.renewalStatus);
      }

      if (filters.showRenewalsOnly) {
        query = query.eq('is_renewal', true);
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('business_license_applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Apply pagination and ordering
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Transform data to match the expected interface
      const transformedLicenses: BusinessLicense[] = (data || []).map(license => ({
        id: license.id,
        license_number: license.license_number || '',
        business_legal_name: license.business_legal_name,
        business_type: license.business_type,
        business_street_address: license.business_street_address,
        owner_first_name: license.owner_first_name,
        owner_last_name: license.owner_last_name,
        application_status: license.application_status,
        base_amount_cents: license.base_amount_cents || 0,
        total_fee_cents: license.total_fee_cents || 0,
        submitted_at: license.submitted_at,
        approved_at: license.approved_at,
        issued_at: license.issued_at,
        created_at: license.created_at,
        updated_at: license.updated_at,
        expires_at: license.expires_at,
        original_issue_date: license.original_issue_date,
        parent_license_id: license.parent_license_id,
        is_renewal: license.is_renewal,
        renewal_generation: license.renewal_generation,
        renewal_status: license.renewal_status,
      }));

      return {
        licenses: transformedLicenses,
        totalCount,
        totalPages,
        currentPage: page,
        pageSize
      };
    },
    enabled: !!user,
  });
};