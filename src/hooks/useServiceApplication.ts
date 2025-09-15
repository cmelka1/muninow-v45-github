import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ServiceApplicationWithTile {
  id: string;
  application_number?: string;
  user_id: string;
  tile_id: string;
  customer_id: string;
  
  // Applicant Information
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
  business_legal_name?: string;
  
  // Address Information
  street_address?: string;
  apt_number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  
  // Application Status & Workflow
  status: 'draft' | 'submitted' | 'under_review' | 'information_requested' | 'resubmitted' | 'approved' | 'denied' | 'withdrawn' | 'expired' | 'issued';
  assigned_reviewer_id?: string;
  review_notes?: string;
  
  // Workflow Timestamps
  submitted_at?: string;
  under_review_at?: string;
  information_requested_at?: string;
  resubmitted_at?: string;
  approved_at?: string;
  denied_at?: string;
  withdrawn_at?: string;
  expired_at?: string;
  issued_at?: string;
  
  // Payment Information
  amount_cents?: number;
  service_fee_cents?: number;
  total_amount_cents?: number;
  payment_status?: string;
  payment_method_type?: string;
  payment_instrument_id?: string;
  payment_processed_at?: string;
  
  // Finix Integration
  finix_transfer_id?: string;
  fraud_session_id?: string;
  idempotency_id?: string;
  transfer_state?: string;
  
  // Merchant & Fee Fields
  merchant_id?: string;
  merchant_name?: string;
  finix_merchant_id?: string;
  merchant_finix_identity_id?: string;
  finix_identity_id?: string;
  merchant_fee_profile_id?: string;
  basis_points?: number;
  fixed_fee?: number;
  ach_basis_points?: number;
  ach_fixed_fee?: number;
  
  // Additional Information
  additional_information?: string;
  service_specific_data?: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  tile: {
    id: string;
    title: string;
    description?: string;
    amount_cents: number;
    form_fields: any[];
    requires_review: boolean;
    customer_id: string;
    is_active: boolean;
  };
  customer: {
    legal_entity_name: string;
    doing_business_as: string;
    business_city: string;
    business_state: string;
  };
}

export const useServiceApplication = (applicationId: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['service-application', applicationId],
    queryFn: async () => {
      if (!applicationId) return null;

      // Query 1: Get the service application data
      const { data: applicationData, error: applicationError } = await supabase
        .from('municipal_service_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (applicationError) {
        console.error('Error fetching service application:', applicationError);
        throw applicationError;
      }

      // Query 2: Get tile data using tile_id
      let tile = null;
      if (applicationData.tile_id) {
        const { data: tileData, error: tileError } = await supabase
          .from('municipal_service_tiles')
          .select('id, title, description, amount_cents, form_fields, requires_review, customer_id, is_active')
          .eq('id', applicationData.tile_id)
          .single();
        
        if (tileError) {
          console.error('Error fetching tile data:', tileError);
        } else {
          tile = tileData;
        }
      }

      // Query 3: Get customer data using customer_id
      let customer = null;
      if (applicationData.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('legal_entity_name, doing_business_as, business_city, business_state')
          .eq('customer_id', applicationData.customer_id)
          .single();
        
        if (customerError) {
          console.error('Error fetching customer data:', customerError);
        } else {
          customer = customerData;
        }
      }

      // Combine all data into the expected structure
      return {
        ...applicationData,
        tile,
        customer,
      } as ServiceApplicationWithTile;
    },
    enabled: !!applicationId,
  });
};