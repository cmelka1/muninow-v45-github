import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PermitDetail {
  permit_id: string;
  permit_number: string;
  permit_type: string;
  application_status: string;
  applicant_full_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_address: string;
  property_address: string;
  scope_of_work: string;
  estimated_construction_value_cents: number;
  total_amount_cents: number;
  payment_amount_cents: number;
  payment_status: string;
  submitted_at: string | null;
  under_review_at: string | null;
  information_requested_at: string | null;
  resubmitted_at: string | null;
  approved_at: string | null;
  denied_at: string | null;
  issued_at: string | null;
  withdrawn_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
  municipal_questions_responses: Record<string, any>;
  assigned_reviewer_id: string | null;
  review_notes: string | null;
  denial_reason: string | null;
  withdrawal_reason: string | null;
  merchant_id: string;
  merchant_name: string | null;
  finix_merchant_id: string | null;
  customer_id: string;
  user_id: string;
  base_fee_cents: number | null;
}

export const usePermit = (permitId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['permit', permitId],
    queryFn: async () => {
      if (!profile) throw new Error('User profile not available');

      // First get the permit application
      const { data: permitData, error: permitError } = await supabase
        .from('permit_applications')
        .select('*')
        .eq('permit_id', permitId)
        .single();

      if (permitError) {
        console.error('Error fetching permit:', permitError);
        throw permitError;
      }

      // Then get the permit type base fee
      const { data: permitTypeData, error: permitTypeError } = await supabase
        .from('permit_types')
        .select('base_fee_cents')
        .eq('name', permitData.permit_type)
        .single();

      if (permitTypeError) {
        console.error('Error fetching permit type:', permitTypeError);
        // Don't throw error, just use null for base_fee_cents
      }

      // Combine the data
      const combinedData = {
        ...permitData,
        base_fee_cents: permitTypeData?.base_fee_cents || null
      };
      
      return combinedData as PermitDetail;
    },
    enabled: !!profile && !!permitId
  });
};