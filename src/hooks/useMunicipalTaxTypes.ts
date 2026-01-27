import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MunicipalTaxType {
  id: string;
  customer_id: string;
  merchant_id?: string;
  tax_type_name: string;
  tax_type_code: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  required_documents: string[];
  instructions_document_path?: string;
  merchant_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMunicipalTaxTypeData {
  tax_type_name: string;
  tax_type_code: string;
  description?: string;
  merchant_id?: string;
  required_documents?: string[];
  instructions_document_path?: string;
  display_order?: number;
}

export interface UpdateMunicipalTaxTypeData {
  id: string;
  tax_type_name?: string;
  tax_type_code?: string;
  description?: string;
  is_active?: boolean;
  display_order?: number;
  required_documents?: string[];
  instructions_document_path?: string;
  merchant_id?: string;
}

// Hook to fetch municipal tax types for a customer
export const useMunicipalTaxTypes = (customerId?: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['municipal-tax-types', customerId || profile?.customer_id],
    queryFn: async () => {
      const targetCustomerId = customerId || profile?.customer_id;
      if (!targetCustomerId) {
        throw new Error('Customer ID is required');
      }

      const { data, error } = await supabase
        .from('municipal_tax_types')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as MunicipalTaxType[];
    },
    enabled: !!(customerId || profile?.customer_id),
  });
};

// Hook to fetch all municipal tax types (for settings management)
export const useAllMunicipalTaxTypes = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['all-municipal-tax-types', profile?.customer_id],
    queryFn: async () => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID is required');
      }

      const { data, error } = await supabase
        .from('municipal_tax_types')
        .select('*')
        .eq('customer_id', profile.customer_id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as MunicipalTaxType[];
    },
    enabled: !!profile?.customer_id,
  });
};

// Hook to create a new municipal tax type
export const useCreateMunicipalTaxType = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMunicipalTaxTypeData) => {
      if (!profile?.customer_id) {
        throw new Error('Customer ID is required');
      }

      const { data: result, error } = await supabase
        .from('municipal_tax_types')
        .insert({
          ...data,
          customer_id: profile.customer_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result as MunicipalTaxType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal-tax-types'] });
      queryClient.invalidateQueries({ queryKey: ['all-municipal-tax-types'] });
    },
  });
};

// Hook to update municipal tax types (bulk update)
export const useUpdateMunicipalTaxTypes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateMunicipalTaxTypeData[]) => {
      const results = await Promise.all(
        updates.map(async (update) => {
          const { id, ...updateData } = update;
          const { data, error } = await supabase
            .from('municipal_tax_types')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return data as MunicipalTaxType;
        })
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal-tax-types'] });
      queryClient.invalidateQueries({ queryKey: ['all-municipal-tax-types'] });
    },
  });
};

// Hook to delete a municipal tax type
export const useDeleteMunicipalTaxType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('municipal_tax_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal-tax-types'] });
      queryClient.invalidateQueries({ queryKey: ['all-municipal-tax-types'] });
    },
  });
};

// Hook to upload tax instruction document
export const useUploadTaxInstructionDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, taxTypeId }: { file: File; taxTypeId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${taxTypeId}-instructions.${fileExt}`;
      const filePath = `${taxTypeId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('tax-instructions')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update the database with the document path
      const { error: updateError } = await supabase
        .from('municipal_tax_types')
        .update({ 
          instructions_document_path: filePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', taxTypeId);

      if (updateError) throw updateError;

      return filePath;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['municipal-tax-types'] });
      queryClient.invalidateQueries({ queryKey: ['all-municipal-tax-types'] });
    },
  });
};