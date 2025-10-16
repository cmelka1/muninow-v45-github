import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBusinessLicenseRenewal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const renewLicense = useMutation({
    mutationFn: async (licenseId: string) => {
      const { data, error } = await supabase.rpc('create_license_renewal', {
        p_original_license_id: licenseId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (newLicenseId) => {
      toast({
        title: "Renewal Started",
        description: "Your renewal application has been created. You'll be redirected to review it.",
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
