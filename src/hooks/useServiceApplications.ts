import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ServiceApplication {
  id: string;
  tile_id: string;
  user_id: string;
  customer_id: string;
  form_data: Record<string, any>;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'paid';
  payment_id?: string;
  fraud_session_id?: string;
  idempotency_id?: string;
  reviewed_by?: string;
  review_notes?: string;
  review_date?: string;
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