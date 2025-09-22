import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useMerchantOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-history-merchant-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('merchant_id')
        .eq('user_id', user.id)
        .not('merchant_id', 'is', null);

      if (error) {
        console.error('Error fetching merchant options:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) return [];

      // Get unique merchant IDs
      const merchantIds = [...new Set(transactions.map(t => t.merchant_id).filter(Boolean))];
      
      // Fetch merchant names
      const { data: merchants } = await supabase
        .from('merchants')
        .select('merchant_name')
        .in('id', merchantIds)
        .not('merchant_name', 'is', null);

      // Get unique merchants
      const uniqueMerchants = [...new Set(merchants?.map(m => m.merchant_name).filter(Boolean) || [])];
      return uniqueMerchants.sort();
    },
    enabled: !!user?.id,
  });
};

export const useCategoryOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-history-category-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('merchant_id')
        .eq('user_id', user.id)
        .not('merchant_id', 'is', null);

      if (error) {
        console.error('Error fetching category options:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) return [];

      // Get unique merchant IDs
      const merchantIds = [...new Set(transactions.map(t => t.merchant_id).filter(Boolean))];
      
      // Fetch merchant categories
      const { data: merchants } = await supabase
        .from('merchants')
        .select('category')
        .in('id', merchantIds)
        .not('category', 'is', null);

      // Get unique categories
      const uniqueCategories = [...new Set(merchants?.map(m => m.category).filter(Boolean) || [])];
      return uniqueCategories.sort();
    },
    enabled: !!user?.id,
  });
};

export const usePaymentMethodOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-history-payment-method-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payment_transactions')
        .select('payment_type, card_brand')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching payment method options:', error);
        throw error;
      }

      // Get unique payment methods
      const paymentMethods = new Set<string>();
      
      data.forEach(payment => {
        if (payment.payment_type === 'GOOGLE_PAY') {
          paymentMethods.add('Google Pay');
        } else if (payment.payment_type === 'APPLE_PAY') {
          paymentMethods.add('Apple Pay');
        } else if (payment.payment_type === 'BANK_ACCOUNT') {
          paymentMethods.add('Bank Account');
        } else if (payment.payment_type === 'PAYMENT_CARD' || payment.card_brand) {
          paymentMethods.add('Card');
        }
      });

      return Array.from(paymentMethods).sort();
    },
    enabled: !!user?.id,
  });
};