import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { PaymentResponse, PaymentError } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId } from '@/utils/paymentUtils';

export type EntityType = 'permit' | 'business_license' | 'tax_submission' | 'service_application';

interface UnifiedPaymentFlowParams {
  entityType: EntityType;
  entityId: string;
  customerId: string;
  merchantId: string;
  baseAmountCents: number;
  onSuccess?: (response: PaymentResponse) => void;
  onError?: (error: PaymentError) => void;
}

interface UnifiedServiceFee {
  serviceFeeToDisplay: number;
  totalAmountToCharge: number;
  basisPoints: number;
  isCard: boolean;
}

export const useUnifiedPaymentFlow = (params: UnifiedPaymentFlowParams) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    paymentInstruments,
    isLoading: paymentMethodsLoading,
    loadPaymentInstruments
  } = useUserPaymentInstruments();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [serviceFee, setServiceFee] = useState<UnifiedServiceFee | null>(null);
  const [googlePayMerchantId, setGooglePayMerchantId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Load Google Pay merchant ID
  useEffect(() => {
    const loadGooglePayMerchantId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-pay-merchant-id', {
          body: { merchant_id: params.merchantId }
        });
        
        if (!error && data.success) {
          setGooglePayMerchantId(data.merchant_id);
        }
      } catch (error) {
        console.error('Error loading Google Pay merchant ID:', error);
      }
    };

    if (params.merchantId) {
      loadGooglePayMerchantId();
    }
  }, [params.merchantId]);

  // Calculate service fee when payment method changes
  useEffect(() => {
    const calculateServiceFee = async () => {
      if (!selectedPaymentMethod || !params.baseAmountCents) {
        setServiceFee(null);
        return;
      }

      try {
        const isCard = ['google-pay', 'apple-pay'].includes(selectedPaymentMethod) || 
                      paymentInstruments.find(p => p.id === selectedPaymentMethod)?.instrument_type === 'PAYMENT_CARD';

        const { data, error } = await supabase.functions.invoke('calculate-service-fee', {
          body: {
            baseAmountCents: params.baseAmountCents,
            paymentInstrumentId: ['google-pay', 'apple-pay'].includes(selectedPaymentMethod) 
              ? null 
              : selectedPaymentMethod,
            paymentMethodType: ['google-pay', 'apple-pay'].includes(selectedPaymentMethod) 
              ? 'card' 
              : null
          }
        });

        if (error) throw error;

        if (data.success) {
          setServiceFee({
            serviceFeeToDisplay: data.serviceFee,
            totalAmountToCharge: data.totalAmount,
            basisPoints: data.basisPoints,
            isCard: data.isCard
          });
        }
      } catch (error) {
        console.error('Service fee calculation error:', error);
        setServiceFee(null);
      }
    };

    calculateServiceFee();
  }, [selectedPaymentMethod, params.baseAmountCents, paymentInstruments]);

  // Set default payment method
  useEffect(() => {
    if (paymentInstruments.length > 0 && !selectedPaymentMethod) {
      const defaultInstrument = paymentInstruments.find(p => p.is_default) || paymentInstruments[0];
      setSelectedPaymentMethod(defaultInstrument.id);
    }
  }, [paymentInstruments, selectedPaymentMethod]);

  const handlePayment = async (): Promise<PaymentResponse> => {
    if (!selectedPaymentMethod || !serviceFee || !user) {
      throw new Error('Missing payment information');
    }

    // Prevent duplicate requests
    const requestId = generateIdempotencyId('payment_request');
    if (processingRequestId === requestId || isProcessingPayment) {
      console.log('Payment already in progress, ignoring duplicate request');
      throw new Error('Payment already in progress');
    }

    setIsProcessingPayment(true);
    setProcessingRequestId(requestId);

    try {
      // Refresh auth token to ensure it's valid
      console.log('Refreshing auth session before payment...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Failed to refresh auth session:', refreshError);
        // Continue anyway - might still work with current token
      }

      // Wait a moment for token refresh to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
      const paymentInstrument = paymentInstruments.find(p => p.id === selectedPaymentMethod);
      const paymentType = paymentInstrument ? 
        (paymentInstrument.instrument_type === 'PAYMENT_CARD' ? 'card' : 'ach') : 
        selectedPaymentMethod; // For google-pay/apple-pay

      const requestBody = {
        entity_type: params.entityType,
        entity_id: params.entityId,
        customer_id: params.customerId,
        merchant_id: params.merchantId,
        base_amount_cents: params.baseAmountCents,
        payment_instrument_id: ['google-pay', 'apple-pay'].includes(selectedPaymentMethod) 
          ? selectedPaymentMethod 
          : paymentInstrument?.id || selectedPaymentMethod,
        payment_type: paymentType,
        fraud_session_id: generateIdempotencyId('fraud_session'),
        card_brand: paymentInstrument?.card_brand,
        card_last_four: paymentInstrument?.card_last_four,
        bank_last_four: paymentInstrument?.bank_last_four,
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
        user_email: user.email
      };

      console.log('Processing unified payment:', requestBody);

      const { data, error } = await supabase.functions.invoke('process-unified-payment', {
        body: requestBody
      });

      if (error) {
        // Distinguish between auth errors and payment errors
        if (error.message?.includes('JWT') || error.message?.includes('401') || error.message?.includes('unauthorized')) {
          throw new Error('Authentication expired. Please refresh the page and try again.');
        }
        throw error;
      }

      if (data.success) {
        const response: PaymentResponse = {
          success: true,
          transaction_id: data.finix_transfer_id,
          payment_id: data.payment_history_id,
          status: 'completed'
        };

        toast({
          title: "Payment Successful",
          description: `Your payment of $${(serviceFee.totalAmountToCharge / 100).toFixed(2)} has been processed successfully.`,
        });

        params.onSuccess?.(response);
        return response;
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Unified payment error:', error);
      
      const classifiedError = classifyPaymentError(error);
      
      toast({
        title: "Payment Failed",
        description: classifiedError.message,
        variant: "destructive",
      });

      params.onError?.(classifiedError);
      throw classifiedError;
    } finally {
      setIsProcessingPayment(false);
      setProcessingRequestId(null);
    }
  };

  const handleGooglePayment = async (): Promise<PaymentResponse> => {
    setSelectedPaymentMethod('google-pay');
    return handlePayment();
  };

  const handleApplePayment = async (): Promise<PaymentResponse> => {
    setSelectedPaymentMethod('apple-pay');
    return handlePayment();
  };

  return {
    // State
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee: serviceFee?.totalAmountToCharge || params.baseAmountCents,
    paymentInstruments,
    paymentMethodsLoading,
    googlePayMerchantId,
    
    // Actions
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments,
  };
};