import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface CreateRenewalParams {
  originalPermitId: string;
  autoApprove?: boolean;
}

export const usePermitRenewal = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ originalPermitId, autoApprove = false }: CreateRenewalParams) => {
      console.log('Initiating permit renewal for:', originalPermitId);
      const { data, error } = await supabase
        .rpc('create_permit_renewal', {
          p_original_permit_id: originalPermitId,
          p_auto_approve: autoApprove
        });

      if (error) {
        console.error('Error creating permit renewal:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (newPermitId) => {
      toast({
        title: "Renewal Started",
        description: "Your permit renewal application has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ['permit'] });
      // Redirect to the new permit application
      if (newPermitId) {
        navigate(`/permits/${newPermitId}`);
      }
    },
    onError: (error: any) => {
      console.error('Renewal error:', error);
      toast({
        title: "Renewal Failed",
        description: error.message || "Failed to create renewal application",
        variant: "destructive",
      });
    },
  });
};
