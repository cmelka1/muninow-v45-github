import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PermitComment {
  id: string;
  permit_id: string;
  reviewer_id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  reviewer?: {
    first_name: string;
    last_name: string;
    email: string;
    account_type: string;
  };
}

export const usePermitComments = (permitId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['permit_comments', permitId],
    queryFn: async () => {
      // Get comments first
      const { data: comments, error: commentsError } = await supabase
        .from('permit_review_comments')
        .select('*')
        .eq('permit_id', permitId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Get reviewer profiles for each comment
      const commentsWithReviewers = await Promise.all(
        comments?.map(async (comment) => {
          const { data: reviewer } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, account_type')
            .eq('id', comment.reviewer_id)
            .single();

          return {
            ...comment,
            reviewer
          };
        }) || []
      );

      return commentsWithReviewers as PermitComment[];
    },
    enabled: !!permitId && !!profile,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: {
      permit_id: string;
      comment_text: string;
      is_internal?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('permit_review_comments')
        .insert({
          ...comment,
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['permit_comments', data.permit_id] });
    },
  });
};