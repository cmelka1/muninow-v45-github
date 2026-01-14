import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useServiceApplicationRenewal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const renewApplication = useMutation({
    mutationFn: async ({ applicationId, autoApprove = false }: { applicationId: string; autoApprove?: boolean }) => {
      const { data, error } = await supabase.rpc('create_service_application_renewal', {
        p_original_application_id: applicationId,
        p_auto_approve: autoApprove
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (newApplicationId) => {
      toast({
        title: "Renewal Approved",
        description: "Your renewal has been approved. You can now proceed to payment.",
      });
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['service-applications'] });
      queryClient.invalidateQueries({ queryKey: ['user-service-applications'] });
      queryClient.invalidateQueries({ queryKey: ['service-application'] });
      
      return newApplicationId;
    },
    onError: (error: any) => {
      toast({
        title: "Renewal Failed",
        description: error.message || "Failed to create renewal application. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    renewApplication: renewApplication.mutateAsync,
    isRenewing: renewApplication.isPending,
  };
};
