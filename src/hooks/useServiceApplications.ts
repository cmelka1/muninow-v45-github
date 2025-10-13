import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ServiceApplication {
  id: string;
  application_number?: string;
  tile_id: string;
  user_id: string;
  customer_id: string;
  
  // Applicant Information
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
  business_legal_name?: string;
  
  // Address Information
  street_address?: string;
  apt_number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  
  // Application Status & Workflow
  status: 'draft' | 'submitted' | 'under_review' | 'information_requested' | 'resubmitted' | 'approved' | 'denied' | 'withdrawn' | 'expired' | 'issued';
  assigned_reviewer_id?: string;
  review_notes?: string;
  
  // Workflow Timestamps
  submitted_at?: string;
  under_review_at?: string;
  information_requested_at?: string;
  resubmitted_at?: string;
  approved_at?: string;
  denied_at?: string;
  withdrawn_at?: string;
  expired_at?: string;
  issued_at?: string;
  
  // Payment Information
  amount_cents?: number;
  service_fee_cents?: number;
  total_amount_cents?: number;
  payment_status?: string;
  payment_method_type?: string;
  payment_instrument_id?: string;
  payment_processed_at?: string;
  
  // Finix Integration
  finix_transfer_id?: string;
  fraud_session_id?: string;
  transfer_state?: string;
  
  // Merchant & Fee Fields
  merchant_id?: string;
  merchant_name?: string;
  finix_merchant_id?: string;
  merchant_finix_identity_id?: string;
  finix_identity_id?: string;
  merchant_fee_profile_id?: string;
  basis_points?: number;
  fixed_fee?: number;
  ach_basis_points?: number;
  ach_fixed_fee?: number;
  
  // Additional Information
  additional_information?: string;
  service_specific_data?: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export const useServiceApplications = (tileId?: string) => {
  return useQuery({
    queryKey: ['service-applications', tileId],
    queryFn: async () => {
      let query = supabase
        .from('municipal_service_applications')
        .select('*');
      
      if (tileId) {
        query = query.eq('tile_id', tileId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ServiceApplication[];
    },
  });
};

export const useUserServiceApplications = () => {
  return useQuery({
    queryKey: ['user-service-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('municipal_service_applications')
        .select('*, municipal_service_tiles(title, customer_id)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateServiceApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (application: Omit<ServiceApplication, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('municipal_service_applications')
        .insert([application])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-applications'] });
      queryClient.invalidateQueries({ queryKey: ['user-service-applications'] });
      toast({
        title: 'Success',
        description: 'Application submitted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to submit application',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateServiceApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceApplication> & { id: string }) => {
      const { data, error } = await supabase
        .from('municipal_service_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-applications'] });
      queryClient.invalidateQueries({ queryKey: ['user-service-applications'] });
      toast({
        title: 'Success',
        description: 'Application updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
    },
  });
};