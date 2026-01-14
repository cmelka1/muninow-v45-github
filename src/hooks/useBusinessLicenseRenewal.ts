import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBusinessLicenseRenewal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const renewLicense = useMutation({
    mutationFn: async ({ licenseId, autoApprove = false }: { licenseId: string; autoApprove?: boolean }) => {
      const { data, error } = await supabase.rpc('create_license_renewal', {
        p_original_license_id: licenseId,
        p_auto_approve: autoApprove
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (newLicenseId) => {
      toast({
        title: "Renewal Approved",
        description: "Your renewal has been approved. You can now proceed to payment.",
      });
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['business-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['business-license'] });
      
      return newLicenseId;
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
    renewLicense: renewLicense.mutateAsync,
    isRenewing: renewLicense.isPending,
  };
};
