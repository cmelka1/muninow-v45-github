import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useTaxSubmissionDetail = (submissionId: string | null) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tax-submission-detail', submissionId],
    queryFn: async () => {
      if (!submissionId || !profile) {
        return null;
      }

      // Municipal users (admin or user) can view submissions for their customer
      const isMunicipal = profile.account_type === 'municipal' || profile.account_type.startsWith('municipal');
      if (isMunicipal && profile.customer_id) {
        const { data, error } = await supabase
          .from('tax_submissions')
          .select('*')
          .eq('id', submissionId)
          .eq('customer_id', profile.customer_id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching tax submission detail (municipal):', error);
          throw error;
        }

        return data;
      }

      // Regular users can view their own submissions
      const { data, error } = await supabase
        .from('tax_submissions')
        .select('*')
        .eq('id', submissionId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tax submission detail (user):', error);
        throw error;
      }

      return data;
    },
    enabled: !!submissionId && !!profile,
  });
};