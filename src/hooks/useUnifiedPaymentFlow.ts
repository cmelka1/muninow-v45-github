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
  const [lastPaymentAttempt, setLastPaymentAttempt] = useState<number | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);

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

    // Prevent duplicate requests with multiple protection layers
    const now = Date.now();
    
    // 1. Check if payment is already processing
    if (isProcessingPayment) {
      console.log('Payment already in progress, ignoring duplicate request');
      throw new Error('Payment already in progress');
    }

    // 2. Implement cooldown period to prevent rapid successive attempts
    if (lastPaymentAttempt && (now - lastPaymentAttempt) < 2000) {
      console.log('Payment attempted too soon after previous attempt');
      throw new Error('Please wait before attempting another payment');
    }

    // Generate or reuse session ID for this payment session
    const sessionId = paymentSessionId || generateIdempotencyId('payment_session');
    if (!paymentSessionId) {
      setPaymentSessionId(sessionId);
    }

    setIsProcessingPayment(true);
    setLastPaymentAttempt(now);

    try {
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
        fraud_session_id: `${sessionId}_${now}`, // Use session-based fraud ID
        card_brand: paymentInstrument?.card_brand,
        card_last_four: paymentInstrument?.card_last_four,
        bank_last_four: paymentInstrument?.bank_last_four,
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
        user_email: user.email
      };

      console.log('Processing unified payment:', { 
        ...requestBody, 
        sessionId,
        attempt_time: new Date(now).toISOString()
      });

      const { data, error } = await supabase.functions.invoke('process-unified-payment', {
        body: requestBody
      });

      if (error) {
        console.error('Payment API error:', error);
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

        // Clear session ID after successful payment
        setPaymentSessionId(null);
        params.onSuccess?.(response);
        return response;
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Unified payment error:', error);
      
      const classifiedError = classifyPaymentError(error);
      
      // Only show toast for non-auth errors to avoid duplicate error messages
      if (!classifiedError.message.includes('Authentication expired')) {
        toast({
          title: "Payment Failed",
          description: classifiedError.message,
          variant: "destructive",
        });
      }

      params.onError?.(classifiedError);
      throw classifiedError;
    } finally {
      setIsProcessingPayment(false);
      // Don't clear session ID here - only clear on success or after cooldown
    }
  };

  const handleGooglePayment = async (): Promise<PaymentResponse> => {
    if (isProcessingPayment) {
      throw new Error('Payment already in progress');
    }
    setSelectedPaymentMethod('google-pay');
    return handlePayment();
  };

  const handleApplePayment = async (): Promise<PaymentResponse> => {
    if (isProcessingPayment) {
      throw new Error('Payment already in progress');
    }
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