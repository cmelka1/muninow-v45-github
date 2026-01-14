import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QuestionOptions } from '@/types/rpc-types';

export interface MunicipalPermitQuestion {
  id: string;
  customer_id: string;
  merchant_id: string | null;
  merchant_name: string | null;
  question_text: string;
  question_type: string;
  question_options: QuestionOptions | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  help_text: string | null;
  created_at: string;
  updated_at: string;
}

export const useMunicipalPermitQuestions = (customerId?: string, merchantId?: string) => {
  return useQuery({
    queryKey: ['municipal_permit_questions', customerId, merchantId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase.rpc('get_municipal_questions', {
        p_customer_id: customerId,
        p_merchant_id: merchantId || null
      });

      if (error) {
        console.error('Error fetching municipal permit questions:', error);
        throw error;
      }

      return data as MunicipalPermitQuestion[];
    },
    enabled: !!customerId,
  });
};