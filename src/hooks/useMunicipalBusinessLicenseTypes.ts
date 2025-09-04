import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MunicipalBusinessLicenseType {
  id: string;
  customer_id: string;
  business_license_type_id: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  municipal_label: string;
  base_fee_cents: number;
  is_active: boolean;
  is_custom: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface CreateMunicipalBusinessLicenseTypeData {
  customer_id: string;
  merchant_id: string | null;
  merchant_name: string | null;
  municipal_label: string;
  base_fee_cents: number;
  is_custom?: boolean;
  display_order?: number;
}

interface UpdateMunicipalBusinessLicenseTypeData {
  municipal_label?: string;
  base_fee_cents?: number;
  is_active?: boolean;
  display_order?: number;
}

export const useMunicipalBusinessLicenseTypes = (customerId?: string) => {
  return useQuery({
    queryKey: ['municipal_business_license_types', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .rpc('get_municipal_business_license_types', { p_customer_id: customerId });

      if (error) {
        console.error('Error fetching municipal business license types:', error);
        throw error;
      }

      return (data as any[]) || [];
    },
    enabled: !!customerId,
  });
};

export const useCreateMunicipalBusinessLicenseType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMunicipalBusinessLicenseTypeData) => {
      const { data: result, error } = await supabase
        .from('municipal_business_license_types')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['municipal_business_license_types', variables.customer_id]
      });
      toast({
        title: 'Success',
        description: 'Business license type created successfully.',
      });
    },
    onError: (error) => {
      console.error('Error creating municipal business license type:', error);
      toast({
        title: 'Error',
        description: 'Failed to create business license type.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateMunicipalBusinessLicenseType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMunicipalBusinessLicenseTypeData }) => {
      const { data: result, error } = await supabase
        .from('municipal_business_license_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['municipal_business_license_types', result.customer_id]
      });
      toast({
        title: 'Success',
        description: 'Business license type updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating municipal business license type:', error);
      toast({
        title: 'Error',
        description: 'Failed to update business license type.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteMunicipalBusinessLicenseType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from('municipal_business_license_types')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['municipal_business_license_types', result.customer_id]
      });
      toast({
        title: 'Success',
        description: 'Business license type deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting municipal business license type:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete business license type.',
        variant: 'destructive',
      });
    },
  });
};