import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerPaymentMethod } from '@/types/customer-payment-method';

export const useCustomerPaymentMethods = (customerId: string) => {
  return useQuery<CustomerPaymentMethod[]>({
    queryKey: ['customer-payment-methods', customerId],
    queryFn: async () => {
      console.log('🔍 Fetching payment methods for customer ID:', customerId);
      
      // Use direct table query with any type since the table isn't in Supabase types yet
      const { data, error } = await supabase
        .from('customer_payment_method' as any)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching payment methods:', error);
        throw error;
      }

      console.log('📥 Payment methods result:', { data });
      return (data || []) as unknown as CustomerPaymentMethod[];
    },
    enabled: !!customerId,
  });
};