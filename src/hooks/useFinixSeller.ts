import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FinixSellerFormData } from '@/utils/finixFormUtils';

export const useFinixSeller = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitSellerIdentity = async (data: FinixSellerFormData) => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting Finix Seller Identity:', JSON.stringify(data, null, 2));
      
      const { data: response, error } = await supabase.functions.invoke('create-finix-seller', {
        body: data
      });

      if (error) {
        throw new Error(error.message || 'Failed to create Finix seller identity');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Finix Seller Identity Created:', JSON.stringify(response, null, 2));
      
      toast({
        title: "Seller Identity Created Successfully",
        description: `Finix Identity ID: ${response.finix_response.id}`,
      });

      return response;
    } catch (error) {
      console.error('Seller identity creation error:', error);
      toast({
        title: "Error creating seller identity",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitSellerIdentity,
    isSubmitting
  };
};