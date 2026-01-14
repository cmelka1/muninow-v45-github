import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormResponses } from '@/types/rpc-types';

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
  base_amount_cents?: number;
  total_fee_cents?: number;
  service_fee_cents?: number;
  total_amount_cents?: number;
  additional_info?: Record<string, unknown>;
  form_responses?: FormResponses;
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
          user_id: user.id,
          customer_id: data.customer_id,
          merchant_id: data.merchant_id,
          license_type_id: data.license_type_id,
          business_legal_name: data.business_legal_name,
          doing_business_as: data.doing_business_as,
          business_type: data.business_type,
          business_description: data.business_description,
          federal_ein: data.federal_ein,
          business_street_address: data.business_street_address,
          business_apt_number: data.business_apt_number,
          business_city: data.business_city,
          business_state: data.business_state,
          business_zip_code: data.business_zip_code,
          business_phone: data.business_phone,
          business_email: data.business_email,
          owner_first_name: data.owner_first_name,
          owner_last_name: data.owner_last_name,
          owner_title: data.owner_title,
          owner_phone: data.owner_phone,
          owner_email: data.owner_email,
          owner_street_address: data.owner_street_address,
          owner_apt_number: data.owner_apt_number,
          owner_city: data.owner_city,
          owner_state: data.owner_state,
          owner_zip_code: data.owner_zip_code,
          base_amount_cents: data.base_amount_cents,
          total_fee_cents: data.total_fee_cents,
          service_fee_cents: data.service_fee_cents,
          total_amount_cents: data.total_amount_cents,
          additional_info: data.additional_info,
          form_responses: data.form_responses,
          merchant_name: data.merchant_name,
          basis_points: data.basis_points,
          fixed_fee: data.fixed_fee,
          ach_basis_points: data.ach_basis_points,
          ach_fixed_fee: data.ach_fixed_fee,
          merchant_fee_profile_id: data.merchant_fee_profile_id,
          finix_transfer_id: data.finix_transfer_id,
          fraud_session_id: data.fraud_session_id,
          application_status: 'draft',
        } as Record<string, unknown>)
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
        .update(data as Record<string, unknown>)
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