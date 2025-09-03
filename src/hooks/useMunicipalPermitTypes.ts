import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimpleAuthContext';

export interface MunicipalPermitType {
  id: string;
  customer_id: string;
  permit_type_id: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  municipal_label: string;
  base_fee_cents: number;
  processing_days: number;
  requires_inspection: boolean;
  is_active: boolean;
  is_custom: boolean;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  permit_types?: {
    id: string;
    name: string;
    description: string;
    base_fee_cents: number;
    processing_days: number;
    requires_inspection: boolean;
  };
}

export interface CreateMunicipalPermitTypeRequest {
  permit_type_id?: string;
  merchant_id?: string;
  merchant_name?: string;
  municipal_label: string;
  base_fee_cents: number;
  processing_days: number;
  requires_inspection: boolean;
  is_custom: boolean;
  description?: string;
  display_order?: number;
}

export const useMunicipalPermitTypes = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['municipal-permit-types', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID required');
      }

      const { data, error } = await supabase
        .from('municipal_permit_types')
        .select(`
          *,
          permit_types (
            id,
            name,
            description,
            base_fee_cents,
            processing_days,
            requires_inspection
          )
        `)
        .eq('customer_id', profile.customer_id)
        .order('display_order', { ascending: true })
        .order('municipal_label', { ascending: true });

      if (error) {
        throw error;
      }

      return data as MunicipalPermitType[];
    },
    enabled: !!profile?.customer_id,
  });
};

export const useCreateMunicipalPermitType = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateMunicipalPermitTypeRequest) => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID required');
      }

      const { data, error } = await supabase
        .from('municipal_permit_types')
        .insert({
          customer_id: profile.customer_id,
          ...request,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['municipal-permit-types', profile?.customer_id] 
      });
    },
  });
};

export const useUpdateMunicipalPermitType = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<CreateMunicipalPermitTypeRequest> 
    }) => {
      const { data, error } = await supabase
        .from('municipal_permit_types')
        .update(updates)
        .eq('id', id)
        .eq('customer_id', profile?.customer_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['municipal-permit-types', profile?.customer_id] 
      });
    },
  });
};

export const useDeleteMunicipalPermitType = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('municipal_permit_types')
        .delete()
        .eq('id', id)
        .eq('customer_id', profile?.customer_id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['municipal-permit-types', profile?.customer_id] 
      });
    },
  });
};