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

export const useServiceApplicationPaymentMethods = (applicationData: ServiceApplicationData | null) => {
  const { toast } = useToast();
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Setup unified payment flow with service application entity type
  const unifiedPayment = useUnifiedPaymentFlow({
    entityType: 'service_application',
    entityId: applicationId || undefined,
    customerId: applicationData?.customer_id || '',
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
    if (!applicationData) {
      toast({
        title: 'Error',
        description: 'Application data is missing',
        variant: 'destructive',
      });
      return { success: false, error: 'Application data is missing' };
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
      console.log('📝 Creating service application with payment...');

      // Create service application record first
      const { data: createResponse, error: createError } = await supabase.functions.invoke(
        'create-service-application-with-payment',
        {
          body: {
            tile_id: applicationData.tile_id,
            customer_id: applicationData.customer_id,
            merchant_id: applicationData.merchant_id,
            user_id: applicationData.user_id,
            form_data: applicationData.form_data,
            base_amount_cents: applicationData.base_amount_cents,
            merchant_name: applicationData.merchant_name,
            category: applicationData.category,
            subcategory: applicationData.subcategory,
            statement_descriptor: applicationData.statement_descriptor,
          },
        }
      );

      if (createError) throw createError;
      if (!createResponse?.success) {
        throw new Error(createResponse?.error || 'Failed to create service application');
      }

      const newApplicationId = createResponse.service_application_id;
      console.log('✅ Service application created:', newApplicationId);
      setApplicationId(newApplicationId);

      // Now process payment through unified flow
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
    if (!applicationData) {
      toast({
        title: 'Error',
        description: 'Application data is missing',
        variant: 'destructive',
      });
      return { success: false, error: 'Application data is missing' };
    }

    try {
      console.log('📝 Creating service application for Google Pay...');

      // Create service application record first
      const { data: createResponse, error: createError } = await supabase.functions.invoke(
        'create-service-application-with-payment',
        {
          body: {
            tile_id: applicationData.tile_id,
            customer_id: applicationData.customer_id,
            merchant_id: applicationData.merchant_id,
            user_id: applicationData.user_id,
            form_data: applicationData.form_data,
            base_amount_cents: applicationData.base_amount_cents,
            merchant_name: applicationData.merchant_name,
            category: applicationData.category,
            subcategory: applicationData.subcategory,
            statement_descriptor: applicationData.statement_descriptor,
          },
        }
      );

      if (createError) throw createError;
      if (!createResponse?.success) {
        throw new Error(createResponse?.error || 'Failed to create service application');
      }

      const newApplicationId = createResponse.service_application_id;
      console.log('✅ Service application created for Google Pay:', newApplicationId);
      setApplicationId(newApplicationId);

      // Set payment method and process through unified flow
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
    if (!applicationData) {
      toast({
        title: 'Error',
        description: 'Application data is missing',
        variant: 'destructive',
      });
      return { success: false, error: 'Application data is missing' };
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
      console.log('📝 Creating service application for Apple Pay...');

      // Create service application record first
      const { data: createResponse, error: createError } = await supabase.functions.invoke(
        'create-service-application-with-payment',
        {
          body: {
            tile_id: applicationData.tile_id,
            customer_id: applicationData.customer_id,
            merchant_id: applicationData.merchant_id,
            user_id: applicationData.user_id,
            form_data: applicationData.form_data,
            base_amount_cents: applicationData.base_amount_cents,
            merchant_name: applicationData.merchant_name,
            category: applicationData.category,
            subcategory: applicationData.subcategory,
            statement_descriptor: applicationData.statement_descriptor,
          },
        }
      );

      if (createError) throw createError;
      if (!createResponse?.success) {
        throw new Error(createResponse?.error || 'Failed to create service application');
      }

      const newApplicationId = createResponse.service_application_id;
      console.log('✅ Service application created for Apple Pay:', newApplicationId);
      setApplicationId(newApplicationId);

      // Set payment method and process through unified flow
      setSelectedPaymentMethod('apple-pay');
      return await unifiedPayment.handleApplePayment();
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
    applicationId,

    // Actions
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments: unifiedPayment.loadPaymentInstruments,
  };
};
