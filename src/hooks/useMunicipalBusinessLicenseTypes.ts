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
  business_license_type_id?: string;
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

      const { data, error } = await supabase.rpc('get_municipal_business_license_types', { 
        p_customer_id: customerId 
      });

      if (error) {
        console.error('Error fetching municipal business license types:', error);
        throw error;
      }

      return (data as MunicipalBusinessLicenseType[]) || [];
    },
    enabled: !!customerId,
  });
};

export const useCreateMunicipalBusinessLicenseType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMunicipalBusinessLicenseTypeData) => {
      const { data: result, error } = await supabase.rpc('create_municipal_business_license_type', {
        p_customer_id: data.customer_id,
        p_municipal_label: data.municipal_label,
        p_base_fee_cents: data.base_fee_cents,
        p_business_license_type_id: data.business_license_type_id || null,
        p_merchant_id: data.merchant_id,
        p_merchant_name: data.merchant_name,
        p_is_custom: data.is_custom ?? true,
        p_display_order: data.display_order ?? 999
      });

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
      const { data: result, error } = await supabase.rpc('update_municipal_business_license_type', {
        p_id: id,
        p_municipal_label: data.municipal_label || null,
        p_base_fee_cents: data.base_fee_cents || null,
        p_is_active: data.is_active ?? null,
        p_display_order: data.display_order || null
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      // Invalidate all municipal business license types queries since we don't have customer_id here
      queryClient.invalidateQueries({
        queryKey: ['municipal_business_license_types']
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
      const { data: result, error } = await supabase.rpc('update_municipal_business_license_type', {
        p_id: id,
        p_municipal_label: null,
        p_base_fee_cents: null,
        p_is_active: false,
        p_display_order: null
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['municipal_business_license_types']
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

export const useInitializeMunicipalBusinessLicenseTypes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data: result, error } = await supabase.rpc('initialize_standard_business_license_types', {
        p_customer_id: customerId
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({
        queryKey: ['municipal_business_license_types', customerId]
      });
      toast({
        title: 'Success',
        description: 'Standard business license types initialized successfully.',
      });
    },
    onError: (error) => {
      console.error('Error initializing business license types:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize business license types.',
        variant: 'destructive',
      });
    },
  });
};