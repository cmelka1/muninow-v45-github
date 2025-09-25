import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BuildingPermitsMerchant {
  id: string;
  merchant_name: string;
  business_name: string;
  customer_city: string;
  customer_state: string;
  customer_id: string;
  finix_merchant_id: string;
}

export const useBuildingPermitsMerchant = (customerId?: string) => {
  return useQuery({
    queryKey: ['building_permits_merchant', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await supabase
        .from('merchants')
        .select('id, merchant_name, business_name, customer_city, customer_state, customer_id, finix_merchant_id')
        .eq('subcategory', 'Building Permits')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching building permits merchant:', error);
        throw error;
      }

      return data as BuildingPermitsMerchant | null;
    },
    enabled: !!customerId,
  });
};