import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PermitDetail {
  permit_id: string;
  permit_number: string;
  permit_type_id: string;
  permit_type_name: string | null;
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
  payment_processed_at: string | null;
  base_amount_cents: number;
  service_fee_cents: number;
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
  is_renewable?: boolean;
  renewal_reminder_days?: number;
  expires_at?: string | null;
  renewal_status?: string | null;
}

export const usePermit = (permitId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['permit', permitId],
    queryFn: async () => {
      if (!profile) throw new Error('User profile not available');

      const { data: permitData, error: permitError } = await supabase
        .from('permit_applications')
        .select(`
          *,
          permit_types_v2(name, is_renewable, renewal_reminder_days, validity_duration_days)
        `)
        .eq('permit_id', permitId)
        .single();

      if (permitError) {
        console.error('Error fetching permit:', permitError);
        throw permitError;
      }
      
      // Transform to flatten the join
      const typeData = permitData.permit_types_v2 as any;
      const transformedPermit = {
        ...permitData,
        permit_type_name: typeData?.name || null,
        is_renewable: typeData?.is_renewable || false,
        renewal_reminder_days: typeData?.renewal_reminder_days || 30
      };
      
      return transformedPermit as PermitDetail;
    },
    enabled: !!profile && !!permitId
  });
};