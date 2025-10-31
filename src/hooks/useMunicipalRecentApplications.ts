import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecentPermit {
  id: string;
  permit_number: string;
  submitted_at: string | null;
  applicant_full_name: string;
  permit_type_name: string | null;
  merchant_name: string | null;
  base_fee_cents: number;
  application_status: string;
  payment_status: string | null;
}

export interface RecentBusinessLicense {
  id: string;
  license_number: string;
  submitted_at: string | null;
  business_legal_name: string;
  owner_first_name: string;
  owner_last_name: string;
  business_type: string;
  merchant_name: string | null;
  base_amount_cents: number;
  application_status: string;
  payment_status: string | null;
}

export interface RecentTaxSubmission {
  id: string;
  submitted_at: string | null;
  payer_business_name: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string;
  tax_type: string;
  merchant_name: string | null;
  base_amount_cents: number;
  submission_status: string;
  payment_status: string | null;
}

export interface RecentServiceApplication {
  id: string;
  application_number: string | null;
  submitted_at: string | null;
  applicant_name: string | null;
  business_legal_name: string | null;
  user_id: string;
  service_name: string | null;
  tile_name: string;
  merchant_name: string | null;
  base_amount_cents: number;
  status: string;
  payment_status: string | null;
  expires_at: string | null;
  renewal_status: string | null;
  is_renewable: boolean | null;
}

export const useMunicipalRecentApplications = () => {
  const { profile } = useAuth();

  const permitsQuery = useQuery({
    queryKey: ['recent-permits', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) throw new Error('No customer ID');

      const { data, error } = await supabase
        .from('permit_applications')
        .select(`
          permit_id,
          permit_number,
          submitted_at,
          applicant_full_name,
          merchant_name,
          payment_amount_cents,
          application_status,
          payment_status,
          permit_types_v2(name)
        `)
        .eq('customer_id', profile.customer_id)
        .neq('application_status', 'draft')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.permit_id,
        permit_number: item.permit_number || '',
        submitted_at: item.submitted_at,
        applicant_full_name: item.applicant_full_name || '',
        permit_type_name: item.permit_types_v2?.name || null,
        merchant_name: item.merchant_name,
        base_fee_cents: item.payment_amount_cents || 0,
        application_status: item.application_status || '',
        payment_status: item.payment_status
      })) as RecentPermit[];
    },
    enabled: !!profile?.customer_id && !!profile?.account_type?.startsWith('municipal')
  });

  const licensesQuery = useQuery({
    queryKey: ['recent-licenses', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) throw new Error('No customer ID');

      const { data, error } = await supabase
        .from('business_license_applications')
        .select(`
          id,
          license_number,
          submitted_at,
          business_legal_name,
          owner_first_name,
          owner_last_name,
          business_type,
          merchant_name,
          base_amount_cents,
          application_status,
          payment_status
        `)
        .eq('customer_id', profile.customer_id)
        .neq('application_status', 'draft')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as RecentBusinessLicense[];
    },
    enabled: !!profile?.customer_id && !!profile?.account_type?.startsWith('municipal')
  });

  const taxesQuery = useQuery({
    queryKey: ['recent-taxes', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) throw new Error('No customer ID');

      const { data, error } = await supabase
        .from('tax_submissions')
        .select(`
          id,
          submitted_at,
          payer_business_name,
          first_name,
          last_name,
          user_id,
          tax_type,
          merchant_name,
          base_amount_cents,
          submission_status,
          payment_status
        `)
        .eq('customer_id', profile.customer_id)
        .neq('submission_status', 'draft')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as RecentTaxSubmission[];
    },
    enabled: !!profile?.customer_id && !!profile?.account_type?.startsWith('municipal')
  });

  const servicesQuery = useQuery({
    queryKey: ['recent-services', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) throw new Error('No customer ID');

      const { data, error } = await supabase
        .from('municipal_service_applications')
        .select(`
          id,
          application_number,
          submitted_at,
          applicant_name,
          business_legal_name,
          user_id,
          service_name,
          merchant_name,
          base_amount_cents,
          status,
          payment_status,
          expires_at,
          renewal_status,
          tile_id,
          municipal_service_tiles!inner(is_renewable, title)
        `)
        .eq('customer_id', profile.customer_id)
        .neq('status', 'draft')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        is_renewable: (item as any).municipal_service_tiles?.is_renewable || false,
        tile_name: (item as any).municipal_service_tiles?.title || ''
      })) as RecentServiceApplication[];
    },
    enabled: !!profile?.customer_id && !!profile?.account_type?.startsWith('municipal')
  });

  return {
    permits: permitsQuery.data || [],
    licenses: licensesQuery.data || [],
    taxes: taxesQuery.data || [],
    services: servicesQuery.data || [],
    isLoading: permitsQuery.isLoading || licensesQuery.isLoading || taxesQuery.isLoading || servicesQuery.isLoading,
    error: permitsQuery.error || licensesQuery.error || taxesQuery.error || servicesQuery.error
  };
};
