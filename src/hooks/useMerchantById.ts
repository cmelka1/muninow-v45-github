import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MerchantById {
  id: string;
  merchant_name: string;
  business_name: string;
  subcategory: string | null;
}

/**
 * Fetch a single merchant by ID - more efficient than fetching all merchants
 * and filtering in memory.
 */
export const useMerchantById = (merchantId?: string | null) => {
  return useQuery({
    queryKey: ['merchant-by-id', merchantId],
    queryFn: async () => {
      if (!merchantId) return null;

      const { data, error } = await supabase
        .from('merchants')
        .select('id, merchant_name, business_name, subcategory')
        .eq('id', merchantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching merchant by id:', error);
        throw error;
      }

      return data as MerchantById | null;
    },
    enabled: !!merchantId,
  });
};
