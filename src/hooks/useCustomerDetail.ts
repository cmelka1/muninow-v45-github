import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerDetail = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      console.log('🔍 Fetching customer detail for ID:', customerId);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      console.log('📥 Customer detail result:', { data, error: error?.message });

      if (error) {
        console.error('❌ Error fetching customer:', error);
        throw error;
      }

      return data;
    },
    enabled: !!customerId,
  });
};