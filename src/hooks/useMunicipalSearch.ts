import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MunicipalSearchFilters {
  serviceType?: string;
  status?: string;
  dateRange?: string;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface UseMunicipalSearchParams extends PaginationParams {
  searchTerm?: string;
  filters?: MunicipalSearchFilters;
}

export interface MunicipalApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessName: string | null;
  serviceType: 'permit' | 'license' | 'tax' | 'service';
  serviceName: string;
  dateSubmitted: string;
  municipality: string;
  status: string;
  paymentStatus: string;
  detailPath: string;
  customerId: string;
}

/**
 * Municipal Search Hook
 * 
 * Searches municipal users and their applications (permits, licenses, taxes, services).
 */
export const useMunicipalSearch = (params?: UseMunicipalSearchParams) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['municipal-search', profile?.customer_id, params],
    queryFn: async () => {
      if (!profile?.customer_id) {
        return { data: [], count: 0 };
      }

      const searchTerm = params?.searchTerm?.toLowerCase() || '';

      // Step 1: Find all user_ids that have applications for this customer
      const [permitsUsers, licensesUsers, taxesUsers, servicesUsers] = await Promise.all([
        supabase
          .from('permit_applications')
          .select('user_id')
          .eq('customer_id', profile.customer_id),
        supabase
          .from('business_license_applications')
          .select('user_id')
          .eq('customer_id', profile.customer_id),
        supabase
          .from('tax_submissions')
          .select('user_id')
          .eq('customer_id', profile.customer_id),
        supabase
          .from('municipal_service_applications')
          .select('user_id')
          .eq('customer_id', profile.customer_id)
      ]);

      // Collect all unique user IDs
      const userIdsSet = new Set<string>();
      
      permitsUsers.data?.forEach(p => p.user_id && userIdsSet.add(p.user_id));
      licensesUsers.data?.forEach(l => l.user_id && userIdsSet.add(l.user_id));
      taxesUsers.data?.forEach(t => t.user_id && userIdsSet.add(t.user_id));
      servicesUsers.data?.forEach(s => s.user_id && userIdsSet.add(s.user_id));

      const allUserIds = Array.from(userIdsSet);

      if (allUserIds.length === 0) {
        return { data: [], count: 0 };
      }

      // Step 2: Search within these user profiles
      let profileQuery = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, business_legal_name, street_address, city, customer_id')
        .in('id', allUserIds);

      // Apply search term across multiple fields with full name + reversed order support
      if (searchTerm) {
        const normalized = searchTerm.trim().replace(/\s+/g, ' ');
        const searchWords = normalized.split(/\s+/).filter(word => word.length > 0);

        if (searchWords.length >= 2) {
          // Multiple words - match First Last and Last First, plus single-field fallbacks
          const firstWord = searchWords[0];
          const lastWord = searchWords[searchWords.length - 1];

          profileQuery = profileQuery.or(
            [
              `and(first_name.ilike.%${firstWord}%,last_name.ilike.%${lastWord}%)`,
              `and(first_name.ilike.%${lastWord}%,last_name.ilike.%${firstWord}%)`,
              `first_name.ilike.%${normalized}%`,
              `last_name.ilike.%${normalized}%`,
              `email.ilike.%${normalized}%`,
              `business_legal_name.ilike.%${normalized}%`,
              `street_address.ilike.%${normalized}%`,
              `city.ilike.%${normalized}%`,
            ].join(',')
          );
        } else {
          // Single word - search across all fields
          profileQuery = profileQuery.or(
            [
              `first_name.ilike.%${normalized}%`,
              `last_name.ilike.%${normalized}%`,
              `email.ilike.%${normalized}%`,
              `business_legal_name.ilike.%${normalized}%`,
              `street_address.ilike.%${normalized}%`,
              `city.ilike.%${normalized}%`,
            ].join(',')
          );
        }
      }

      const { data: profiles, error: profileError } = await profileQuery;

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        return { data: [], count: 0 };
      }

      const userIds = profiles.map(p => p.id);

      // Fetch all application types for these users in parallel
      const [permits, licenses, taxes, services, customers, serviceTiles] = await Promise.all([
        // Permits
        supabase
          .from('permit_applications')
          .select('permit_id, permit_number, application_status, customer_id, submitted_at, created_at, payment_status, user_id, permit_types_v2(name)')
          .in('user_id', userIds)
          .eq('customer_id', profile.customer_id),
        
        // Business Licenses  
        supabase
          .from('business_license_applications')
          .select('id, license_number, business_type, application_status, customer_id, submitted_at, created_at, payment_status, user_id')
          .in('user_id', userIds)
          .eq('customer_id', profile.customer_id),
        
        // Tax Submissions
        supabase
          .from('tax_submissions')
          .select('id, tax_type, submission_status, customer_id, submitted_at, created_at, payment_status, user_id')
          .in('user_id', userIds)
          .eq('customer_id', profile.customer_id),
        
        // Municipal Service Applications
        supabase
          .from('municipal_service_applications')
          .select('id, tile_id, status, payment_status, customer_id, submitted_at, user_id')
          .in('user_id', userIds)
          .eq('customer_id', profile.customer_id),
        
        // Get customer names
        supabase
          .from('customers')
          .select('customer_id, legal_entity_name'),
        
        // Get service tiles
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

      // Create lookup maps
      const profileMap = new Map(
        profiles.map(p => [p.id, p])
      );
      
      const customerMap = new Map(
        customers.data?.map(c => [c.customer_id, c.legal_entity_name]) || []
      );
      
      const serviceTilesMap = new Map(
        serviceTiles.data?.map(t => [t.id, t.title]) || []
      );

      // Transform and combine all applications
      const allApplications: MunicipalApplication[] = [
        // Transform permits
        ...(permits.data || []).map((permit: any) => {
          const userProfile = profileMap.get(permit.user_id);
          return {
            id: permit.permit_id,
            userId: permit.user_id,
            userName: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Unknown',
            userEmail: userProfile?.email || '',
            businessName: userProfile?.business_legal_name || null,
            serviceType: 'permit' as const,
            serviceName: permit.permit_types_v2?.name || 'Unknown',
            dateSubmitted: permit.submitted_at || permit.created_at,
            municipality: customerMap.get(permit.customer_id) || 'Unknown',
            status: permit.application_status,
            paymentStatus: permit.payment_status || 'unpaid',
            customerId: permit.customer_id,
            detailPath: `/municipal/permit/${permit.permit_id}`
          };
        }),

        // Transform licenses
        ...(licenses.data || []).map(license => {
          const userProfile = profileMap.get(license.user_id);
          return {
            id: license.id,
            userId: license.user_id,
            userName: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Unknown',
            userEmail: userProfile?.email || '',
            businessName: userProfile?.business_legal_name || null,
            serviceType: 'license' as const,
            serviceName: license.business_type,
            dateSubmitted: license.submitted_at || license.created_at,
            municipality: customerMap.get(license.customer_id) || 'Unknown',
            status: license.application_status,
            paymentStatus: license.payment_status || 'unpaid',
            customerId: license.customer_id,
            detailPath: `/municipal/business-license/${license.id}`
          };
        }),

        // Transform tax submissions
        ...(taxes.data || []).map(tax => {
          const userProfile = profileMap.get(tax.user_id);
          return {
            id: tax.id,
            userId: tax.user_id,
            userName: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Unknown',
            userEmail: userProfile?.email || '',
            businessName: userProfile?.business_legal_name || null,
            serviceType: 'tax' as const,
            serviceName: tax.tax_type.includes('_') 
              ? tax.tax_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              : tax.tax_type,
            dateSubmitted: tax.submitted_at || tax.created_at,
            municipality: customerMap.get(tax.customer_id) || 'Unknown',
            status: tax.submission_status,
            paymentStatus: tax.payment_status || 'unpaid',
            customerId: tax.customer_id,
            detailPath: `/municipal/tax/${tax.id}`
          };
        }),

        // Transform service applications
        ...(services.data || []).map(service => {
          const userProfile = profileMap.get(service.user_id);
          return {
            id: service.id,
            userId: service.user_id,
            userName: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Unknown',
            userEmail: userProfile?.email || '',
            businessName: userProfile?.business_legal_name || null,
            serviceType: 'service' as const,
            serviceName: serviceTilesMap.get(service.tile_id) || 'Service Application',
            dateSubmitted: service.submitted_at,
            municipality: customerMap.get(service.customer_id) || 'Unknown',
            status: service.status,
            paymentStatus: service.payment_status || 'unpaid',
            customerId: service.customer_id,
            detailPath: `/municipal/service-application/${service.id}`
          };
        })
      ];

      // Apply filters
      let filteredApplications = allApplications;

      // Filter out draft applications
      filteredApplications = filteredApplications.filter(app => app.status !== 'draft');

      if (params?.filters?.serviceType && params.filters.serviceType !== 'all') {
        filteredApplications = filteredApplications.filter(app => app.serviceType === params.filters?.serviceType);
      }

      if (params?.filters?.status && params.filters.status !== 'all') {
        filteredApplications = filteredApplications.filter(app => app.status === params.filters?.status);
      }

      if (params?.filters?.dateRange && params.filters.dateRange !== 'all_time') {
        const now = new Date();
        let startDate: Date;
        
        switch (params.filters.dateRange) {
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
      const from = ((params?.page || 1) - 1) * (params?.pageSize || 10);
      const to = from + (params?.pageSize || 10);
      const paginatedApplications = filteredApplications.slice(from, to);

      return {
        data: paginatedApplications,
        count: totalCount
      };
    },
    enabled: !!profile?.customer_id && !!profile.account_type && 
             (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal')),
  });
};

export const useMunicipalSearchFilterOptions = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['municipal-search-filter-options', profile?.customer_id],
    queryFn: async () => {
      return {
        serviceTypes: [
          { value: 'all', label: 'All Services' },
          { value: 'permit', label: 'Building Permits' },
          { value: 'license', label: 'Business Licenses' },
          { value: 'tax', label: 'Taxes' },
          { value: 'service', label: 'Services' }
        ],
        statuses: [
          { value: 'all', label: 'All Statuses' },
          { value: 'submitted', label: 'Submitted' },
          { value: 'under_review', label: 'Under Review' },
          { value: 'approved', label: 'Approved' },
          { value: 'denied', label: 'Denied' },
          { value: 'issued', label: 'Issued' }
        ]
      };
    },
    enabled: !!profile?.customer_id && !!profile.account_type && 
             (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal')),
  });
};
