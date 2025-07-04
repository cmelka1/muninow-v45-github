import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useVendorOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['vendor-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('municipal_bills')
        .select('vendor')
        .eq('user_id', user.id)
        .in('payment_status', ['unpaid', 'overdue', 'delinquent'])
        .not('vendor', 'is', null);

      if (error) {
        console.error('Error fetching vendor options:', error);
        throw error;
      }

      // Get unique vendors
      const uniqueVendors = [...new Set(data.map(bill => bill.vendor))];
      return uniqueVendors.sort();
    },
    enabled: !!user?.id,
  });
};

export const useCategoryOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['category-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('municipal_bills')
        .select('category')
        .eq('user_id', user.id)
        .in('payment_status', ['unpaid', 'overdue', 'delinquent'])
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching category options:', error);
        throw error;
      }

      // Get unique categories
      const uniqueCategories = [...new Set(data.map(bill => bill.category))];
      return uniqueCategories.sort();
    },
    enabled: !!user?.id,
  });
};

export const usePaymentStatusOptions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['payment-status-options', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('municipal_bills')
        .select('payment_status')
        .eq('user_id', user.id)
        .in('payment_status', ['unpaid', 'overdue', 'delinquent'])
        .not('payment_status', 'is', null);

      if (error) {
        console.error('Error fetching payment status options:', error);
        throw error;
      }

      // Get unique payment statuses
      const uniqueStatuses = [...new Set(data.map(bill => bill.payment_status))];
      return uniqueStatuses.sort();
    },
    enabled: !!user?.id,
  });
};