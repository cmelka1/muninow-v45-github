import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PermitInspection {
  id: string;
  permit_id: string;
  inspection_type: string;
  inspector_id: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  notes: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export const usePermitInspections = (permitId: string) => {
  return useQuery({
    queryKey: ['permit_inspections', permitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_inspections')
        .select('*')
        .eq('permit_id', permitId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as PermitInspection[];
    },
    enabled: !!permitId,
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspection: Omit<PermitInspection, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('permit_inspections')
        .insert(inspection)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit_inspections', data.permit_id] });
    },
  });
};

export const useUpdateInspection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PermitInspection> }) => {
      const { data, error } = await supabase
        .from('permit_inspections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit_inspections', data.permit_id] });
    },
  });
};