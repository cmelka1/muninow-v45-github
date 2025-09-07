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
    console.group('💳 UNIFIED_PAYMENT_FLOW_START');
    console.log('Payment initiation timestamp:', new Date().toISOString());
    console.log('Payment parameters:', {
      entityType: params.entityType,
      entityId: params.entityId,
      selectedPaymentMethod,
      serviceFee,
      hasUser: !!user,
      userEmail: user?.email,
      authState: {
        userId: user?.id,
        sessionValid: !!user?.aud,
        currentTime: Math.floor(Date.now() / 1000)
      }
    });

    if (!selectedPaymentMethod || !serviceFee || !user) {
      console.error('❌ Missing required payment information:', {
        hasSelectedPaymentMethod: !!selectedPaymentMethod,
        hasServiceFee: !!serviceFee,
        hasUser: !!user
      });
      console.groupEnd();
      throw new Error('Missing payment information');
    }

    // Prevent duplicate requests with multiple protection layers
    const now = Date.now();
    
    // 1. Check if payment is already processing
    if (isProcessingPayment) {
      console.log('⚠️ Payment already in progress, ignoring duplicate request');
      console.groupEnd();
      throw new Error('Payment already in progress');
    }

    // 2. Implement cooldown period to prevent rapid successive attempts
    if (lastPaymentAttempt && (now - lastPaymentAttempt) < 2000) {
      console.log('⚠️ Payment attempted too soon after previous attempt:', {
        lastAttempt: new Date(lastPaymentAttempt).toISOString(),
        timeSince: now - lastPaymentAttempt,
        cooldownRemaining: 2000 - (now - lastPaymentAttempt)
      });
      console.groupEnd();
      throw new Error('Please wait before attempting another payment');
    }

    // Generate or reuse session ID for this payment session
    const sessionId = paymentSessionId || generateIdempotencyId('payment_session');
    if (!paymentSessionId) {
      setPaymentSessionId(sessionId);
    }

    console.log('🚀 Setting payment processing state');
    setIsProcessingPayment(true);
    setLastPaymentAttempt(now);

    try {
      // Log current auth state before payment
      const { data: authData, error: authError } = await supabase.auth.getSession();
      console.log('📋 Current auth session:', {
        hasSession: !!authData.session,
        hasUser: !!authData.session?.user,
        accessToken: authData.session?.access_token ? 'Present (hidden)' : 'Missing',
        refreshToken: authData.session?.refresh_token ? 'Present (hidden)' : 'Missing',
        expiresAt: authData.session?.expires_at,
        currentTime: Math.floor(Date.now() / 1000),
        timeUntilExpiry: authData.session?.expires_at ? authData.session.expires_at - Math.floor(Date.now() / 1000) : 'N/A',
        authError: authError?.message || 'None'
      });
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

      console.log('📤 Sending payment request:', { 
        ...requestBody, 
        sessionId,
        attempt_time: new Date(now).toISOString(),
        requestSize: JSON.stringify(requestBody).length
      });

      const requestStartTime = Date.now();
      const { data, error } = await supabase.functions.invoke('process-unified-payment', {
        body: requestBody
      });
      const requestEndTime = Date.now();
      
      console.log('📥 Edge function response received:', {
        duration: requestEndTime - requestStartTime,
        hasData: !!data,
        hasError: !!error,
        dataStructure: data ? Object.keys(data) : 'N/A',
        errorStructure: error ? Object.keys(error) : 'N/A'
      });

      if (error) {
        console.error('❌ Edge function returned error:', {
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
          isAuthError: error.message?.includes('JWT') || error.message?.includes('401') || error.message?.includes('unauthorized'),
          timestamp: new Date().toISOString()
        });
        
        // Distinguish between auth errors and payment errors
        if (error.message?.includes('JWT') || error.message?.includes('401') || error.message?.includes('unauthorized')) {
          console.log('🔑 Authentication error detected - suggesting refresh');
          console.groupEnd();
          throw new Error('Authentication expired. Please refresh the page and try again.');
        }
        console.groupEnd();
        throw error;
      }

      if (data.success) {
        console.log('✅ Payment completed successfully:', {
          transactionId: data.finix_transfer_id,
          paymentId: data.payment_history_id,
          totalAmount: serviceFee.totalAmountToCharge,
          timestamp: new Date().toISOString()
        });

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
        console.log('🎉 Calling onSuccess callback');
        console.groupEnd();
        params.onSuccess?.(response);
        return response;
      } else {
        console.error('❌ Edge function returned unsuccessful response:', data);
        console.groupEnd();
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('💥 Payment processing error caught:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error?.message,
        timestamp: new Date().toISOString(),
        callStack: error?.stack
      });
      
      const classifiedError = classifyPaymentError(error);
      console.log('🏷️ Error classification result:', classifiedError);
      
      // Only show toast for non-auth errors to avoid duplicate error messages
      if (!classifiedError.message.includes('Authentication expired')) {
        console.log('📢 Showing error toast to user');
        toast({
          title: "Payment Failed",
          description: classifiedError.message,
          variant: "destructive",
        });
      } else {
        console.log('🔕 Skipping error toast for auth error');
      }

      console.log('📞 Calling onError callback with classified error');
      console.groupEnd();
      params.onError?.(classifiedError);
      throw classifiedError;
    } finally {
      console.log('🧹 Cleaning up payment state');
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