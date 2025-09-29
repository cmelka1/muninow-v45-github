import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserPaymentInstrument {
  id: string;
  user_id: string;
  finix_payment_instrument_id: string;
  instrument_type: 'PAYMENT_CARD' | 'BANK_ACCOUNT';
  nickname: string | null;
  display_name: string;
  is_default: boolean;
  enabled: boolean;
  status: string;
  card_brand: string | null;
  card_last_four: string | null;
  card_expiration_month: number | null;
  card_expiration_year: number | null;
  bank_account_type: string | null;
  bank_last_four: string | null;
  billing_address_line1: string | null;
  billing_city: string | null;
  billing_region: string | null;
  billing_postal_code: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserPaymentInstruments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentInstruments, setPaymentInstruments] = useState<UserPaymentInstrument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPaymentInstruments = async () => {
    if (!user) {
      setPaymentInstruments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the database function to get payment instruments with display names
      const { data, error } = await supabase.rpc('get_user_payment_instruments_with_display_names');

      if (error) {
        console.error('Error loading payment instruments:', error);
        toast({
          title: "Error",
          description: "Failed to load payment methods. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setPaymentInstruments((data || []) as UserPaymentInstrument[]);
    } catch (error) {
      console.error('Error loading payment instruments:', error);
      toast({
        title: "Error",
        description: "Failed to load payment methods. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultPaymentInstrument = async (instrumentId: string) => {
    try {
      const { error } = await supabase.rpc('set_default_user_payment_instrument', {
        p_id: instrumentId
      });

      if (error) {
        console.error('Error setting default payment instrument:', error);
        toast({
          title: "Error",
          description: "Failed to set default payment method. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Default payment method updated successfully.",
      });

      // Reload the payment instruments
      await loadPaymentInstruments();
    } catch (error) {
      console.error('Error setting default payment instrument:', error);
      toast({
        title: "Error",
        description: "Failed to set default payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deletePaymentInstrument = async (instrumentId: string) => {
    try {
      const { error } = await supabase.rpc('disable_user_payment_instrument', {
        p_id: instrumentId
      });

      if (error) {
        console.error('Error deleting payment instrument:', error);
        toast({
          title: "Error",
          description: "Failed to delete payment method. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Payment method deleted successfully.",
      });

      // Reload the payment instruments
      await loadPaymentInstruments();
    } catch (error) {
      console.error('Error deleting payment instrument:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment method. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadPaymentInstruments();
  }, [user]);

  return {
    paymentInstruments,
    isLoading,
    loadPaymentInstruments,
    setDefaultPaymentInstrument,
    deletePaymentInstrument,
  };
};