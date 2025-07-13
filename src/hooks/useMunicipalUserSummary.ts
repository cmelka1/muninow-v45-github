import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MunicipalUserSummary {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  street_address: string | null;
  apt_number: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  account_type: string;
  business_legal_name: string | null;
  created_at: string;
  updated_at: string;
  bill_count: number;
  total_amount_due_cents: number;
  has_bills: boolean;
}

export const useMunicipalUserSummary = (userId?: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['municipal-user-summary', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_user_bill_summary_for_municipal', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching municipal user summary:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] as MunicipalUserSummary : null;
    },
    enabled: !!(userId && profile?.account_type === 'municipal'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};