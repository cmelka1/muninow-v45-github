import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';
import { QuestionOptions } from '@/types/rpc-types';

interface CreateMunicipalPermitQuestionData {
  question_text: string;
  question_type: string;
  question_options?: QuestionOptions | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  help_text?: string;
  merchant_id?: string;
}

interface UpdateMunicipalPermitQuestionData {
  id: string;
  question_text?: string;
  question_type?: string;
  question_options?: QuestionOptions | null;
  is_required?: boolean;
  display_order?: number;
  is_active?: boolean;
  help_text?: string;
  merchant_id?: string;
}

export const useCreateMunicipalPermitQuestion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateMunicipalPermitQuestionData) => {
      if (!user) throw new Error('User not authenticated');

      // Get customer_id from user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('customer_id')
        .eq('id', user.id)
        .single();

      if (!profile?.customer_id) {
        throw new Error('Customer ID not found');
      }

      const { data: result, error } = await supabase
        .from('municipal_permit_questions')
        .insert({
          ...data,
          customer_id: profile.customer_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal_permit_questions'] });
      toast.success('Permit question created successfully');
    },
    onError: (error) => {
      console.error('Error creating permit question:', error);
      toast.error('Failed to create permit question');
    },
  });
};

export const useUpdateMunicipalPermitQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateMunicipalPermitQuestionData) => {
      const { data: result, error } = await supabase
        .from('municipal_permit_questions')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal_permit_questions'] });
      toast.success('Permit question updated successfully');
    },
    onError: (error) => {
      console.error('Error updating permit question:', error);
      toast.error('Failed to update permit question');
    },
  });
};

export const useDeleteMunicipalPermitQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('municipal_permit_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal_permit_questions'] });
      toast.success('Permit question deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting permit question:', error);
      toast.error('Failed to delete permit question');
    },
  });
};

export const useReorderMunicipalPermitQuestions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questions: Array<{ id: string; display_order: number }>) => {
      const updates = questions.map(({ id, display_order }) =>
        supabase
          .from('municipal_permit_questions')
          .update({ display_order })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipal_permit_questions'] });
      toast.success('Question order updated successfully');
    },
    onError: (error) => {
      console.error('Error reordering questions:', error);
      toast.error('Failed to update question order');
    },
  });
};