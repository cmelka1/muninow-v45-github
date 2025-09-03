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

export interface PermitTypeWithCustomization {
  permit_type_id: string;
  permit_type_name: string;
  standard_fee_cents: number;
  standard_processing_days: number;
  standard_requires_inspection: boolean;
  standard_description: string | null;
  // Municipal customization (if exists)
  municipal_permit_type_id?: string;
  municipal_label?: string;
  custom_fee_cents?: number;
  custom_processing_days?: number;
  custom_requires_inspection?: boolean;
  merchant_id?: string;
  merchant_name?: string;
  is_active?: boolean;
  is_customized: boolean;
  is_custom?: boolean; // Added to support custom permit types
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

export const usePermitTypesWithCustomizations = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['permit-types-with-customizations', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID required');
      }

      // Fetch all standard permit types
      const { data: standardTypes, error: standardError } = await supabase
        .from('permit_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (standardError) {
        throw standardError;
      }

      // Fetch municipal customizations
      const { data: customizations, error: customError } = await supabase
        .from('municipal_permit_types')
        .select('*')
        .eq('customer_id', profile.customer_id);

      if (customError) {
        throw customError;
      }

      // Combine data
      const combined: PermitTypeWithCustomization[] = standardTypes.map(standard => {
        const customization = customizations.find(c => c.permit_type_id === standard.id);
        
        return {
          permit_type_id: standard.id,
          permit_type_name: standard.name,
          standard_fee_cents: standard.base_fee_cents,
          standard_processing_days: standard.processing_days,
          standard_requires_inspection: standard.requires_inspection,
          standard_description: standard.description,
          municipal_permit_type_id: customization?.id,
          municipal_label: customization?.municipal_label,
          custom_fee_cents: customization?.base_fee_cents,
          custom_processing_days: customization?.processing_days,
          custom_requires_inspection: customization?.requires_inspection,
          merchant_id: customization?.merchant_id,
          merchant_name: customization?.merchant_name,
          is_active: customization?.is_active ?? true,
          is_customized: !!customization,
        };
      });

      return combined;
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
      queryClient.invalidateQueries({ 
        queryKey: ['permit-types-with-customizations', profile?.customer_id] 
      });
    },
  });
};

export const useUpsertMunicipalPermitType = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      permitTypeId,
      updates
    }: {
      permitTypeId: string;
      updates: Partial<CreateMunicipalPermitTypeRequest>;
    }) => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID required');
      }

      // Check if customization exists
      const { data: existing } = await supabase
        .from('municipal_permit_types')
        .select('id')
        .eq('customer_id', profile.customer_id)
        .eq('permit_type_id', permitTypeId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('municipal_permit_types')
          .update(updates)
          .eq('id', existing.id)
          .eq('customer_id', profile.customer_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new - ensure municipal_label is provided
        const insertData = {
          customer_id: profile.customer_id,
          permit_type_id: permitTypeId,
          municipal_label: updates.municipal_label || '', // Provide default empty string
          ...updates,
        };

        const { data, error } = await supabase
          .from('municipal_permit_types')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['municipal-permit-types', profile?.customer_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['permit-types-with-customizations', profile?.customer_id] 
      });
    },
  });
};