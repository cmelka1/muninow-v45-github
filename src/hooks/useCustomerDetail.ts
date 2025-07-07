import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerDetail = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!customerId,
  });
};