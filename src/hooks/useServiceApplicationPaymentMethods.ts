import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedPaymentFlow } from './useUnifiedPaymentFlow';
import { useToast } from '@/hooks/use-toast';

interface ServiceApplicationData {
  tile_id: string;
  customer_id: string;
  merchant_id: string;
  user_id: string;
  form_data: any;
  documents: any[];
  base_amount_cents: number;
  merchant_name?: string;
  category?: string;
  subcategory?: string;
  statement_descriptor?: string;
}

export const useServiceApplicationPaymentMethods = (
  applicationData: ServiceApplicationData | null,
  applicationId?: string
) => {
  const { toast } = useToast();

  // Setup unified payment flow with provided application ID
  const unifiedPayment = useUnifiedPaymentFlow({
    entityType: 'service_application',
    entityId: applicationId,
    merchantId: applicationData?.merchant_id || '',
    baseAmountCents: applicationData?.base_amount_cents || 0,
    onSuccess: async (response) => {
      console.log('✅ Service application payment successful:', response);
      toast({
        title: 'Payment Successful',
        description: 'Your service application has been submitted and paid.',
      });
    },
    onError: (error) => {
      console.error('❌ Service application payment failed:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Map properties from unified payment flow
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    paymentMethodsLoading,
    googlePayMerchantId,
  } = unifiedPayment;

  // Get top 3 payment methods prioritizing default
  const topPaymentMethods = paymentInstruments
    .sort((a, b) => {
      if (a.is_default) return -1;
      if (b.is_default) return 1;
      return 0;
    })
    .slice(0, 3);

  // Handle regular payment
  const handlePayment = async () => {
    if (!applicationData || !applicationId) {
      toast({
        title: 'Error',
        description: 'Application data and ID are required',
        variant: 'destructive',
      });
      return { success: false, error: 'Application data and ID are required' };
    }

    if (!selectedPaymentMethod) {
      toast({
        title: 'Payment Method Required',
        description: 'Please select a payment method',
        variant: 'destructive',
      });
      return { success: false, error: 'No payment method selected' };
    }

    try {
      console.log('💳 Processing payment for application:', applicationId);
      // Process payment through unified flow - application already exists
      return await unifiedPayment.handlePayment();
    } catch (error: any) {
      console.error('❌ Service application payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  // Handle Google Pay
  const handleGooglePayment = async () => {
    if (!applicationData || !applicationId) {
      toast({
        title: 'Error',
        description: 'Application data and ID are required',
        variant: 'destructive',
      });
      return { success: false, error: 'Application data and ID are required' };
    }

    try {
      console.log('💳 Processing Google Pay for application:', applicationId);
      // Set payment method and process through unified flow - application already exists
      setSelectedPaymentMethod('google-pay');
      return await unifiedPayment.handleGooglePayment();
    } catch (error: any) {
      console.error('❌ Google Pay error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process Google Pay payment',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  // Handle Apple Pay
  const handleApplePayment = async () => {
    if (!applicationData || !applicationId) {
      toast({
        title: 'Error',
        description: 'Application data and ID are required',
        variant: 'destructive',
      });
      return { success: false, error: 'Application data and ID are required' };
    }

    // Check Apple Pay availability
    if (!window.ApplePaySession || !window.ApplePaySession.canMakePayments()) {
      toast({
        title: 'Apple Pay Not Available',
        description: 'Apple Pay is not available on this device',
        variant: 'destructive',
      });
      return { success: false, error: 'Apple Pay not available' };
    }

    try {
      console.log('💳 Apple Pay not available - requires authentication');
      toast({
        title: 'Authentication Required',
        description: 'Please log in to use Apple Pay',
        variant: 'destructive',
      });
      throw new Error('Apple Pay requires authentication');
    } catch (error: any) {
      console.error('❌ Apple Pay error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process Apple Pay payment',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  return {
    // State
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    topPaymentMethods,
    paymentMethodsLoading,
    googlePayMerchantId,

    // Actions
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments: unifiedPayment.loadPaymentInstruments,
  };
};
