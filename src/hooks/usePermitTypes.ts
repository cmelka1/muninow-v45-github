import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PermitType {
  id: string;
  name: string;
  description: string;
  base_fee_cents: number;
  processing_days: number;
  requires_inspection: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePermitTypes = () => {
  return useQuery({
    queryKey: ['permit_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      return data as PermitType[];
    },
  });
};