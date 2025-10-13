import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CreateBusinessLicenseApplicationData {
  customer_id: string;
  merchant_id?: string;
  license_type_id?: string;
  business_legal_name: string;
  doing_business_as?: string;
  business_type: string;
  business_description?: string;
  federal_ein?: string;
  business_street_address: string;
  business_apt_number?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_phone?: string;
  business_email?: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_title?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_street_address: string;
  owner_apt_number?: string;
  owner_city: string;
  owner_state: string;
  owner_zip_code: string;
  base_fee_cents?: number;
  total_fee_cents?: number;
  service_fee_cents?: number;
  total_amount_cents?: number;
  additional_info?: any;
  form_responses?: any;
  // Merchant fee profile fields
  merchant_name?: string;
  basis_points?: number;
  fixed_fee?: number;
  ach_basis_points?: number;
  ach_fixed_fee?: number;
  merchant_fee_profile_id?: string;
  finix_transfer_id?: string;
  // Payment tracking fields
  fraud_session_id?: string;
}

export const useBusinessLicenseApplication = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createApplication = useMutation({
    mutationFn: async (data: CreateBusinessLicenseApplicationData) => {
      if (!user) throw new Error('User must be authenticated');

      const { data: result, error } = await supabase
        .from('business_license_applications')
        .insert({
          ...data,
          user_id: user.id,
          application_status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-licenses'] });
    },
  });

  const updateApplication = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateBusinessLicenseApplicationData> }) => {
      const { data: result, error } = await supabase
        .from('business_license_applications')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-licenses'] });
    },
  });

  const submitApplication = useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from('business_license_applications')
        .update({ 
          application_status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-licenses'] });
    },
  });

  return {
    createApplication,
    updateApplication,
    submitApplication,
  };
};