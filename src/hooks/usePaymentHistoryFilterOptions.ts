import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePaymentVendorOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-vendor-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payment_records')
        .select('vendor')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('vendor', 'is', null);

      if (error) {
        console.error('Error fetching payment vendor options:', error);
        throw error;
      }

      // Get unique vendors
      const uniqueVendors = [...new Set(data.map(record => record.vendor))];
      return uniqueVendors.filter(vendor => vendor).sort();
    },
    enabled: !!user?.id,
  });
};

export const usePaymentCategoryOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-category-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payment_records')
        .select('category')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching payment category options:', error);
        throw error;
      }

      // Get unique categories
      const uniqueCategories = [...new Set(data.map(record => record.category))];
      return uniqueCategories.filter(category => category).sort();
    },
    enabled: !!user?.id,
  });
};

export const usePaymentMethodOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-method-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payment_records')
        .select('method_name')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('method_name', 'is', null);

      if (error) {
        console.error('Error fetching payment method options:', error);
        throw error;
      }

      // Get unique payment methods
      const uniqueMethods = [...new Set(data.map(record => record.method_name))];
      return uniqueMethods.filter(method => method).sort();
    },
    enabled: !!user?.id,
  });
};