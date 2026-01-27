import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CustomerMerchant {
  id: string;
  merchant_name: string;
  business_name?: string;
  finix_merchant_id?: string;
}

/**
 * Hook to fetch all merchants for the current customer.
 * Used in municipal settings to populate merchant dropdowns.
 */
export const useCustomerMerchants = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['customer-merchants', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID is required');
      }

      const { data, error } = await supabase
        .from('merchants')
        .select('id, merchant_name, business_name, finix_merchant_id')
        .eq('customer_id', profile.customer_id)
        .order('merchant_name', { ascending: true });

      if (error) throw error;
      return data as CustomerMerchant[];
    },
    enabled: !!profile?.customer_id,
  });
};
