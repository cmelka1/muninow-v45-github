import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PermitRequest {
  id: string;
  permit_id: string;
  reviewer_id: string;
  request_type: string;
  request_details: string;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  reviewer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const usePermitRequests = (permitId: string) => {
  return useQuery({
    queryKey: ['permit_requests', permitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_review_requests')
        .select('*')
        .eq('permit_id', permitId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PermitRequest[];
    },
    enabled: !!permitId,
  });
};

export const useCreateRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      permit_id: string;
      request_details: string;
      due_date?: string;
      request_type: string;
    }) => {
      const { data, error } = await supabase
        .from('permit_review_requests')
        .insert({
          ...request,
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit_requests', data.permit_id] });
    },
  });
};

export const useUpdateRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PermitRequest> }) => {
      const { data, error } = await supabase
        .from('permit_review_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit_requests', data.permit_id] });
    },
  });
};