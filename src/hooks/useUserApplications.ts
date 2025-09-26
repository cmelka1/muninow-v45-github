import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserApplication {
  id: string;
  serviceType: 'permit' | 'license' | 'tax' | 'service';
  serviceName: string;
  dateSubmitted: string;
  municipality: string;
  status: string;
  paymentStatus: string;
  detailUrl?: string;
  customerId: string;
  detailPath: string;
}

interface UseUserApplicationsParams {
  filters?: {
    serviceType?: string;
    status?: string;
    dateRange?: string;
  };
  page?: number;
  pageSize?: number;
}

export const useUserApplications = ({ filters = {}, page = 1, pageSize = 10 }: UseUserApplicationsParams = {}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-applications', filters, page, pageSize, user?.id],
    queryFn: async () => {
      if (!user?.id) return { applications: [], count: 0 };

      // Fetch all application types in parallel
      const [permits, licenses, taxes, services, customers, serviceTiles] = await Promise.all([
        // Permits
        supabase
          .from('permit_applications')
          .select('permit_id, permit_number, permit_type, application_status, customer_id, submitted_at, created_at, payment_status')
          .eq('user_id', user.id),
        
        // Business Licenses  
        supabase
          .from('business_license_applications')
          .select('id, license_number, business_type, application_status, customer_id, submitted_at, created_at, payment_status')
          .eq('user_id', user.id),
        
        // Tax Submissions
        supabase
          .from('tax_submissions')
          .select('id, tax_type, submission_status, customer_id, submission_date, created_at, payment_status')
          .eq('user_id', user.id),
        
        // Municipal Service Applications
        supabase
          .from('municipal_service_applications')
          .select('id, tile_id, status, payment_status, customer_id, created_at')
          .eq('user_id', user.id),
        
        // Get customer names for municipality lookup
        supabase
          .from('customers')
          .select('customer_id, legal_entity_name'),
        
        // Get service tiles separately
        supabase
          .from('municipal_service_tiles')
          .select('id, title')
      ]);

      if (permits.error) throw permits.error;
      if (licenses.error) throw licenses.error;
      if (taxes.error) throw taxes.error;
      if (services.error) throw services.error;
      if (customers.error) throw customers.error;
      if (serviceTiles.error) throw serviceTiles.error;

      // Create customer lookup map
      const customerMap = new Map(
        customers.data?.map(c => [c.customer_id, c.legal_entity_name]) || []
      );
      
      // Create service tiles lookup map
      const serviceTilesMap = new Map(
        serviceTiles.data?.map(t => [t.id, t.title]) || []
      );

      // Transform and combine all applications
      const allApplications: UserApplication[] = [
        // Transform permits
        ...(permits.data || []).map(permit => ({
          id: permit.permit_id,
          serviceType: 'permit' as const,
          serviceName: permit.permit_type,
          dateSubmitted: permit.submitted_at || permit.created_at,
          municipality: customerMap.get(permit.customer_id) || 'Unknown',
          status: permit.application_status,
          paymentStatus: permit.payment_status || 'unpaid',
          customerId: permit.customer_id,
          detailPath: `/permit/${permit.permit_id}`
        })),

        // Transform licenses
        ...(licenses.data || []).map(license => ({
          id: license.id,
          serviceType: 'license' as const,
          serviceName: license.business_type,
          dateSubmitted: license.submitted_at || license.created_at,
          municipality: customerMap.get(license.customer_id) || 'Unknown',
          status: license.application_status,
          paymentStatus: license.payment_status || 'unpaid',
          customerId: license.customer_id,
          detailPath: `/business-license/${license.id}`
        })),

        // Transform tax submissions
        ...(taxes.data || []).map(tax => ({
          id: tax.id,
          serviceType: 'tax' as const,
          serviceName: tax.tax_type.includes('_') 
            ? tax.tax_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            : tax.tax_type,
          dateSubmitted: tax.submission_date || tax.created_at,
          municipality: customerMap.get(tax.customer_id) || 'Unknown',
          status: tax.submission_status,
          paymentStatus: tax.payment_status || 'unpaid',
          customerId: tax.customer_id,
          detailPath: `/tax/${tax.id}`
        })),

        // Transform service applications
        ...(services.data || []).map(service => ({
          id: service.id,
          serviceType: 'service' as const,
          serviceName: serviceTilesMap.get(service.tile_id) || 'Service Application',
          dateSubmitted: service.created_at,
          municipality: customerMap.get(service.customer_id) || 'Unknown',
          status: service.status,
          paymentStatus: service.payment_status || 'unpaid',
          customerId: service.customer_id,
          detailPath: `/service-application/${service.id}`,
          detailUrl: `/service-application/${service.id}`
        }))
      ];

      // Apply filters
      let filteredApplications = allApplications;

      if (filters.serviceType && filters.serviceType !== 'all') {
        filteredApplications = filteredApplications.filter(app => app.serviceType === filters.serviceType);
      }

      if (filters.status && filters.status !== 'all') {
        filteredApplications = filteredApplications.filter(app => app.status === filters.status);
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
        
        filteredApplications = filteredApplications.filter(app => 
          new Date(app.dateSubmitted) >= startDate
        );
      }

      // Sort by date submitted (most recent first)
      filteredApplications.sort((a, b) => 
        new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime()
      );

      // Apply pagination
      const totalCount = filteredApplications.length;
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const paginatedApplications = filteredApplications.slice(from, to);

      return {
        applications: paginatedApplications,
        count: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize
      };
    },
    enabled: !!user?.id,
  });
};