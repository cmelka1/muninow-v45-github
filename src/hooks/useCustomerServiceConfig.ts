import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomerServiceConfig {
  id: string;
  customer_id: string;
  building_permits_enabled: boolean;
  business_licenses_enabled: boolean;
  taxes_enabled: boolean;
  sport_reservations_enabled: boolean;
  other_services_enabled: boolean;
  building_permits_merchant_id: string | null;
  business_licenses_merchant_id: string | null;
  created_at: string;
  updated_at: string;
}

// Note: Using type assertions because customer_service_config table 
// is not in generated Supabase types until migration is applied

export const useCustomerServiceConfig = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-service-config', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await (supabase
        .from('customer_service_config' as any)
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle() as any);

      if (error) {
        console.error('Error fetching customer service config:', error);
        throw error;
      }

      return data as CustomerServiceConfig | null;
    },
    enabled: !!customerId,
  });
};

export const useCreateCustomerServiceConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await (supabase
        .from('customer_service_config' as any)
        .insert({ customer_id: customerId })
        .select()
        .single() as any);

      if (error) throw error;
      return data as CustomerServiceConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-service-config', data.customer_id] });
    },
    onError: (error) => {
      console.error('Error creating customer service config:', error);
      toast.error('Failed to create service configuration');
    },
  });
};

export const useUpdateCustomerServiceConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      customerId, 
      updates 
    }: { 
      customerId: string; 
      updates: Partial<Omit<CustomerServiceConfig, 'id' | 'customer_id' | 'created_at' | 'updated_at'>> 
    }) => {
      const { data, error } = await (supabase
        .from('customer_service_config' as any)
        .update(updates)
        .eq('customer_id', customerId)
        .select()
        .single() as any);

      if (error) throw error;
      return data as CustomerServiceConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-service-config', data.customer_id] });
      toast.success('Service configuration updated');
    },
    onError: (error) => {
      console.error('Error updating customer service config:', error);
      toast.error('Failed to update service configuration');
    },
  });
};

