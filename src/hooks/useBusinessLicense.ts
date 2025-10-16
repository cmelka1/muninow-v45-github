import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessLicenseDetail {
  id: string;
  user_id: string;
  customer_id: string;
  merchant_id?: string;
  license_number: string;
  application_status: string;
  business_legal_name: string;
  doing_business_as?: string;
  business_type: string;
  business_description?: string;
  federal_ein?: string;
  state_tax_id?: string;
  business_street_address: string;
  business_apt_number?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_country: string;
  business_phone?: string;
  business_email?: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_title?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_street_address: string;
  owner_apt_number?: string;
  owner_city: string;
  owner_state: string;
  owner_zip_code: string;
  owner_country: string;
  additional_info?: { additionalDetails?: string };
  base_amount_cents: number;
  total_fee_cents: number;
  service_fee_cents?: number;
  total_amount_cents?: number;
  payment_status: string;
  payment_processed_at?: string;
  submitted_at?: string;
  under_review_at?: string;
  information_requested_at?: string;
  resubmitted_at?: string;
  approved_at?: string;
  denied_at?: string;
  withdrawn_at?: string;
  expired_at?: string;
  issued_at?: string;
  created_at: string;
  updated_at: string;
  review_notes?: string;
  denial_reason?: string;
  reviewer_comments?: string;
  assigned_reviewer_id?: string;
  assigned_reviewer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  license_type?: {
    name: string;
    description?: string;
    processing_days?: number;
    requires_inspection: boolean;
  };
}

export const useBusinessLicense = (licenseId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['business-license', licenseId, user?.id],
    queryFn: async () => {
      if (!user || !licenseId) throw new Error('User must be authenticated and license ID provided');

      const { data, error } = await supabase
        .from('business_license_applications')
        .select('*')
        .eq('id', licenseId)
        .single();

      if (error) throw error;

      // Fetch assigned reviewer if exists
      let assigned_reviewer = null;
      if (data.assigned_reviewer_id) {
        const { data: reviewerData } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', data.assigned_reviewer_id)
          .single();
        assigned_reviewer = reviewerData;
      }

      // Fetch license type if exists
      let license_type = null;
      if (data.license_type_id) {
        const { data: typeData } = await supabase
          .from('municipal_business_license_types')
          .select('municipal_label, base_fee_cents, is_active, merchant_name')
          .eq('id', data.license_type_id)
          .single();
        license_type = typeData ? {
          name: typeData.municipal_label,
          description: `Municipal license type - Fee: $${(typeData.base_fee_cents / 100).toFixed(2)}`,
          processing_days: 7, // Default processing days for municipal licenses
          requires_inspection: false // Default value
        } : null;
      }

      return {
        ...data,
        assigned_reviewer,
        license_type,
      } as BusinessLicenseDetail;
    },
    enabled: !!user && !!licenseId,
  });
};