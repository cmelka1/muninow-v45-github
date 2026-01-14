import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';

export interface PermitType {
  id: string;
  customer_id: string;
  name: string;
  description: string | null;
  base_fee_cents: number;
  processing_days: number;
  requires_inspection: boolean;
  merchant_id: string | null;
  merchant_name: string | null;
  display_order: number;
  is_active: boolean;
  is_renewable: boolean;
  renewal_reminder_days: number | null;
  renewal_fee_cents: number | null;
  validity_duration_days: number | null;
  created_at: string;
  updated_at: string;
}

export const usePermitTypes = (customerId?: string) => {
  return useQuery({
    queryKey: ['permit-types', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('permit_types_v2')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('display_order')
        .order('name');

      if (error) {
        console.error('Error fetching permit types:', error);
        throw error;
      }

      return data as PermitType[];
    },
    enabled: !!customerId,
  });
};

export const useCreatePermitType = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (permitType: Partial<PermitType>) => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID is required');
      }

      const { data, error } = await supabase
        .from('permit_types_v2')
        .insert({
          customer_id: profile.customer_id,
          name: permitType.name,
          description: permitType.description,
          base_fee_cents: permitType.base_fee_cents || 0,
          processing_days: permitType.processing_days || 30,
          requires_inspection: permitType.requires_inspection || false,
          merchant_id: permitType.merchant_id,
          merchant_name: permitType.merchant_name,
          display_order: permitType.display_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-types'] });
      toast.success('Permit type created successfully');
    },
    onError: (error) => {
      console.error('Error creating permit type:', error);
      toast.error('Failed to create permit type');
    },
  });
};

export const useUpdatePermitType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PermitType> }) => {
      const { data, error } = await supabase
        .from('permit_types_v2')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-types'] });
      toast.success('Permit type updated successfully');
    },
    onError: (error) => {
      console.error('Error updating permit type:', error);
      toast.error('Failed to update permit type');
    },
  });
};

export const useDeletePermitType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('permit_types_v2')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-types'] });
      toast.success('Permit type deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting permit type:', error);
      toast.error('Failed to delete permit type');
    },
  });
};
