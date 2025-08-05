import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OptimizedPermitDetail {
  permit_id: string;
  permit_number: string;
  permit_type: string;
  application_status: string;
  applicant_full_name: string;
  applicant_email: string;
  applicant_phone: string;
  property_address: string;
  property_apt_number: string | null;
  property_city: string;
  property_state: string;
  property_zip_code: string;
  project_description: string;
  scope_of_work: string;
  estimated_construction_value_cents: number;
  total_amount_cents: number;
  created_at: string;
  submitted_at: string | null;
  under_review_at: string | null;
  information_requested_at: string | null;
  approved_at: string | null;
  denied_at: string | null;
  issued_at: string | null;
  withdrawn_at: string | null;
  expired_at: string | null;
  resubmitted_at: string | null;
  user_id: string;
  customer_id: string;
  merchant_id: string | null;
  merchant_name: string | null;
  assigned_reviewer_id: string | null;
  review_notes: string | null;
  municipal_questions_responses: any;
  base_fee_cents: number;
  processing_days: number;
  requires_inspection: boolean;
}

export const useOptimizedPermit = (permitId: string) => {
  return useQuery({
    queryKey: ['optimized-permit', permitId],
    queryFn: async () => {
      if (!permitId) throw new Error('Permit ID is required');

      const { data, error } = await supabase.rpc('get_permit_with_details', {
        p_permit_id: permitId
      });

      if (error) {
        console.error('Error fetching optimized permit:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Permit not found');
      }

      return data[0] as OptimizedPermitDetail;
    },
    enabled: !!permitId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};