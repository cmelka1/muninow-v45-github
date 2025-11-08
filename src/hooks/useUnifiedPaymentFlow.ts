import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { PaymentResponse, PaymentError } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId } from '@/utils/paymentUtils';
import type { PaymentDataRequest } from '@/types/googlepay';
import { useFinixAuth } from '@/hooks/useFinixAuth';

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
  const [ongoingPaymentPromise, setOngoingPaymentPromise] = useState<Promise<PaymentResponse> | null>(null);
  const [finixMerchantId, setFinixMerchantId] = useState<string | null>(null);

  // Fetch Finix merchant ID from internal merchant UUID
  useEffect(() => {
    const fetchFinixMerchantId = async () => {
      if (!params.merchantId) return;
      
      const { data, error } = await supabase
        .from('merchants')
        .select('finix_merchant_id')
        .eq('id', params.merchantId)
        .single();
        
      if (data?.finix_merchant_id) {
        console.log('✅ Fetched Finix merchant ID:', {
          internal_merchant_id: params.merchantId,
          finix_merchant_id: data.finix_merchant_id
        });
        setFinixMerchantId(data.finix_merchant_id);
      } else if (error) {
        console.error('❌ Error fetching Finix merchant ID:', error);
      }
    };
    
    fetchFinixMerchantId();
  }, [params.merchantId]);

  // Initialize Finix Auth for fraud detection with correct Finix merchant ID
  const { finixSessionKey, isFinixReady } = useFinixAuth(finixMerchantId);

  // Load Google Pay merchant ID
  useEffect(() => {
    const loadGooglePayMerchantId = async () => {
      if (!params.merchantId) {
        console.log('⚠️ No merchant ID provided for Google Pay');
        return;
      }

      try {
        console.log('🔑 Loading merchant ID for:', params.merchantId);
        const { data, error } = await supabase.functions.invoke('get-google-pay-merchant-id', {
          body: { merchant_id: params.merchantId }
        });
        
        console.log('🔑 Merchant ID response:', data, 'error:', error);
        
        if (!error && data.success) {
          console.log('🔑 Final merchant ID set:', data.merchant_id);
          setGooglePayMerchantId(data.merchant_id);
        } else {
          console.warn('🔑 No merchant_id in response or error occurred');
        }
      } catch (error) {
        console.error('🔑 Error loading Google Pay merchant ID:', error);
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
              : null,
            merchantId: params.merchantId
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

  const handlePayment = async (overrideEntityId?: string): Promise<PaymentResponse> => {
    console.group('💳 UNIFIED_PAYMENT_FLOW_START');
    
    // Use override if provided, otherwise fall back to hook's entityId
    const effectiveEntityId = overrideEntityId || params.entityId;
    
    console.log('Payment initiation timestamp:', new Date().toISOString());
    console.log('Payment parameters:', {
      entityType: params.entityType,
      entityId: effectiveEntityId,
      entityIdSource: overrideEntityId ? 'override parameter' : 'hook configuration',
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

    // Single-flight pattern: return existing promise if payment is in progress
    if (ongoingPaymentPromise) {
      console.log('⚠️ Returning existing payment promise (single-flight protection)');
      console.groupEnd();
      return ongoingPaymentPromise;
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

    // Generate or reuse session UUID for this payment session
    const sessionId = paymentSessionId || crypto.randomUUID();
    if (!paymentSessionId) {
      setPaymentSessionId(sessionId);
      console.log('🆕 Generated new payment session UUID:', sessionId);
    } else {
      console.log('♻️ Reusing existing payment session UUID:', sessionId);
    }

    console.log('🚀 Setting payment processing state');
    setIsProcessingPayment(true);
    setLastPaymentAttempt(now);

    // Create the payment promise and store it for single-flight protection
    const paymentPromise = (async () => {
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

      // Prepare metadata for backend tracking and debugging
      const idempotencyMetadata = {
        session_id: sessionId,
        entity_type: params.entityType,
        entity_id: effectiveEntityId,
        user_id: user.id,
        payment_method: paymentType,
        payment_instrument_id: paymentInstrument?.id || selectedPaymentMethod,
        client_user_agent: navigator.userAgent,
        client_timestamp: new Date().toISOString()
      };

      const requestBody = {
        entity_type: params.entityType,
        entity_id: effectiveEntityId,
        customer_id: params.customerId,
        merchant_id: params.merchantId,
        base_amount_cents: params.baseAmountCents,
        payment_instrument_id: ['google-pay', 'apple-pay'].includes(selectedPaymentMethod) 
          ? selectedPaymentMethod 
          : paymentInstrument?.id || selectedPaymentMethod,
        payment_type: paymentType,
        card_brand: paymentInstrument?.card_brand,
        card_last_four: paymentInstrument?.card_last_four,
        bank_last_four: paymentInstrument?.bank_last_four,
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
        user_email: user.email,
        fraud_session_id: finixSessionKey || `fallback_${sessionId}_${now}`, // Use Finix session key
        session_uuid: sessionId, // Send session UUID to backend
        idempotency_metadata: idempotencyMetadata // Send metadata for backend tracking
      };

      console.log('🔐 Unified payment fraud session details:', {
        has_finix_key: !!finixSessionKey,
        is_finix_ready: isFinixReady,
        fraud_session_id: finixSessionKey || `fallback_${sessionId}_${now}`,
        format: (finixSessionKey || `fallback_${sessionId}_${now}`).startsWith('FS') ? 'Finix (correct)' : 'UUID fallback'
      });

      console.log('📤 Sending payment request:', {
        ...requestBody, 
        sessionId,
        attempt_time: new Date(now).toISOString(),
        requestSize: JSON.stringify(requestBody).length
      });

      // Get authentication token
      const authToken = authData.session?.access_token;
      
      if (!authToken) {
        console.error('❌ No auth token available for payment');
        throw new Error('Authentication required. Please sign in again.');
      }
      
      console.info('🔐 process-unified-payment: Auth token present:', !!authToken);

      const requestStartTime = Date.now();
      let data, error;
      const invokeResult = await supabase.functions.invoke('process-unified-payment', {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      data = invokeResult.data;
      error = invokeResult.error;
      
      // Handle 401 by refreshing token and retrying once
      if (error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
        console.warn('⚠️ 401 error on process-unified-payment, refreshing token and retrying...');
        
        const { data: refreshData } = await supabase.auth.refreshSession();
        const newToken = refreshData.session?.access_token;
        
        if (newToken) {
          console.info('🔄 Retrying process-unified-payment with refreshed token');
          const retryResult = await supabase.functions.invoke('process-unified-payment', {
            body: requestBody,
            headers: {
              Authorization: `Bearer ${newToken}`
            }
          });
          data = retryResult.data;
          error = retryResult.error;
        }
      }
      
      const requestEndTime = Date.now();
      
      console.log('📥 Edge function response received:', {
        duration: requestEndTime - requestStartTime,
        hasData: !!data,
        hasError: !!error,
        dataStructure: data ? Object.keys(data) : 'N/A',
        errorStructure: error ? Object.keys(error) : 'N/A',
        fullDataResponse: data,
        successValue: data?.success,
        successType: typeof data?.success,
        successStringified: JSON.stringify(data?.success)
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

      // Parse response if it's returned as a JSON string
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
          console.log('📝 Parsed string response to object:', { 
            originalType: typeof data, 
            parsedType: typeof parsedData,
            success: parsedData?.success 
          });
        } catch (parseError) {
          console.error('❌ Failed to parse response string:', parseError);
          throw new Error('Invalid response format from payment service');
        }
      } else {
        console.log('📝 Response already an object:', { type: typeof data });
      }

      // Enhanced success detection with multiple fallback strategies (using parsed data)
      const directSuccess = parsedData?.success === true || parsedData?.success === 'true';
      const nestedSuccess = parsedData?.data?.success === true || parsedData?.data?.success === 'true';
      const transactionSuccess = !!(parsedData?.transaction_id || parsedData?.finix_transfer_id);
      const statusSuccess = parsedData?.status === 200 || parsedData?.status === 'success' || parsedData?.status === 'paid';
      
      const isSuccess = directSuccess || nestedSuccess || (transactionSuccess && !parsedData?.error);
      
      console.log('🔍 Comprehensive success evaluation:', {
        directSuccess,
        nestedSuccess,
        transactionSuccess,
        statusSuccess,
        hasTransactionId: !!parsedData?.transaction_id,
        hasFinixId: !!parsedData?.finix_transfer_id,
        hasError: !!parsedData?.error,
        finalSuccess: isSuccess,
        rawDataKeys: parsedData ? Object.keys(parsedData) : 'N/A'
      });

      if (isSuccess) {
        console.log('✅ Payment completed successfully:', {
          transactionId: parsedData.finix_transfer_id,
          paymentId: parsedData.transaction_id,
          totalAmount: serviceFee.totalAmountToCharge,
          timestamp: new Date().toISOString()
        });

        const response: PaymentResponse = {
          success: true,
          transaction_id: parsedData.finix_transfer_id,
          payment_id: parsedData.transaction_id,
          status: 'paid'
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
        console.error('❌ Edge function returned unsuccessful response:', {
          fullResponse: parsedData,
          successValue: parsedData?.success,
          successType: typeof parsedData?.success,
          errorValue: parsedData?.error,
          allKeys: parsedData ? Object.keys(parsedData) : 'N/A'
        });
        console.groupEnd();
        throw new Error(parsedData?.error || 'Payment failed - no success flag received');
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
      setOngoingPaymentPromise(null);
      // Don't clear session ID here - only clear on success or after cooldown
    }
    })();

    // Store the promise for single-flight protection
    setOngoingPaymentPromise(paymentPromise);
    
    return paymentPromise;
  };

  const handleGooglePayment = async (): Promise<PaymentResponse> => {
    console.group('💰 GOOGLE_PAY_FLOW_START');
    console.log('Google Pay initiated with merchant ID:', googlePayMerchantId);
    
    if (isProcessingPayment || ongoingPaymentPromise) {
      console.log('⚠️ Payment already in progress - ignoring Google Pay request');
      console.groupEnd();
      throw new Error('Payment already in progress');
    }

    if (!googlePayMerchantId) {
      console.error('❌ Google Pay merchant ID not available');
      console.groupEnd();
      throw new Error('Google Pay not available for this merchant');
    }

    try {
      // Check if Google Pay is available
      if (!window.google || !window.google.payments) {
        console.error('❌ Google Pay API not loaded');
        console.groupEnd();
        throw new Error('Google Pay is not available');
      }

      // Initialize Google Pay client
      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: 'TEST' // Change to 'PRODUCTION' for live
      });

      // Normalize Google Pay total amount calculation
      const totalCentsForGooglePay = serviceFee?.totalAmountToCharge ?? params.baseAmountCents;
      const totalPriceDollars = (totalCentsForGooglePay / 100).toFixed(2);

      const paymentRequest: PaymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD' as const,
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'] as const,
            allowedCardNetworks: ['MASTERCARD', 'VISA'] as const
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY' as const,
            parameters: {
              gateway: 'finix',
              gatewayMerchantId: googlePayMerchantId
            }
          }
        }],
        merchantInfo: {
          merchantId: googlePayMerchantId,
          merchantName: 'Muni Now'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL' as const,
          totalPrice: totalPriceDollars,
          currencyCode: 'USD',
          countryCode: 'US'
        }
      };

      console.log('Google Pay total (cents, dollars):', { totalCentsForGooglePay, totalPriceDollars });
      console.log('🔄 Loading Google Pay payment data...');
      const paymentData = await paymentsClient.loadPaymentData(paymentRequest);
      console.log('✅ Google Pay data loaded successfully');

      // Generate unique session ID that includes entity context to prevent UUID collision
      const uniqueSessionId = paymentSessionId || `gpay_${params.entityId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!paymentSessionId) {
        setPaymentSessionId(uniqueSessionId);
      }
      const clientIdempotencyId = `${uniqueSessionId}_${params.entityId}_google-pay`;
      console.log('🔑 Generated unique Google Pay session ID:', uniqueSessionId);

      // Extract the payment token
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      
      setIsProcessingPayment(true);
      console.log('📤 Sending Google Pay payment to backend...');

      const { data, error } = await supabase.functions.invoke('process-unified-google-pay', {
        body: {
          entity_type: params.entityType,
          entity_id: params.entityId,
          customer_id: params.customerId,
          merchant_id: params.merchantId,
          base_amount_cents: params.baseAmountCents,
          google_pay_token: paymentToken,
          fraud_session_id: finixSessionKey || `fallback_${uniqueSessionId}_${Date.now()}`, // Use Finix session key
          first_name: user?.user_metadata?.first_name,
          last_name: user?.user_metadata?.last_name,
          user_email: user?.email
        }
      });

      console.log('🔐 Google Pay fraud session details:', {
        has_finix_key: !!finixSessionKey,
        is_finix_ready: isFinixReady,
        fraud_session_id: finixSessionKey || `fallback_${uniqueSessionId}_${Date.now()}`,
        format: (finixSessionKey || `fallback_${uniqueSessionId}_${Date.now()}`).startsWith('FS') ? 'Finix (correct)' : 'UUID fallback'
      });

      const responseTime = Date.now() - Date.now();
      console.log(`📊 Google Pay function response received in ${responseTime}ms`);
      console.log('📦 Raw Google Pay response data:', JSON.stringify(data, null, 2));
      console.log('❗ Raw Google Pay response error:', JSON.stringify(error, null, 2));

      if (error) {
        console.error('❌ Google Pay backend error:', error);
        throw error;
      }

      // Parse response if it's a string (handle edge function response format)
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
          console.log('🔧 Parsed string response to JSON:', parsedData);
        } catch (parseError) {
          console.error('Failed to parse Google Pay response:', parseError);
          parsedData = data;
        }
      }

      // Enhanced success detection with multiple fallbacks for Google Pay
      const isSuccess = parsedData?.success === true || 
                       (parsedData?.finix_transfer_id && !parsedData?.error) ||
                       (parsedData?.status === 'paid' || parsedData?.payment_status === 'paid') ||
                       (parsedData?.transaction_id && !parsedData?.error);

      console.log('🔍 Google Pay success detection:', {
        'parsedData?.success': parsedData?.success,
        'has_finix_transfer_id': !!parsedData?.finix_transfer_id,
        'has_transaction_id': !!parsedData?.transaction_id,
        'no_error': !parsedData?.error,
        'status_paid': parsedData?.status === 'paid',
        'payment_status_paid': parsedData?.payment_status === 'paid',
        'final_isSuccess': isSuccess
      });

      if (isSuccess) {
        console.log('✅ Google Pay payment successful:', parsedData);
        const response: PaymentResponse = {
          success: true,
          transaction_id: parsedData.finix_transfer_id,
          payment_id: parsedData.transaction_id,
          status: 'paid'
        };
        
        toast({
          title: "Google Pay Successful",
          description: `Your payment of $${totalPriceDollars} has been processed successfully.`,
        });

        setPaymentSessionId(null);
        console.groupEnd();
        params.onSuccess?.(response);
        return response;
      } else {
        console.error('❌ Google Pay failed - detailed analysis:', {
          data,
          parsedData,
          error,
          successCheck: parsedData?.success,
          hasTransferId: !!parsedData?.finix_transfer_id,
          hasTransactionId: !!parsedData?.transaction_id,
          hasError: !!parsedData?.error
        });
        throw new Error(parsedData?.error || parsedData?.message || 'Google Pay payment failed');
      }
    } catch (error) {
      console.error('💥 Google Pay error:', error);
      const classifiedError = classifyPaymentError(error);
      
      // Only show toast for actual errors, not user cancellations
      if (classifiedError.type !== 'user_cancelled') {
        toast({
          title: "Google Pay Failed",
          description: classifiedError.message,
          variant: "destructive",
        });
      }

      console.groupEnd();
      params.onError?.(classifiedError);
      throw classifiedError;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleApplePayment = async (): Promise<PaymentResponse> => {
    console.log('🍎 [useUnifiedPaymentFlow] ========================================');
    console.log('🍎 [useUnifiedPaymentFlow] APPLE PAY PAYMENT INITIATED');
    console.log('🍎 [useUnifiedPaymentFlow] ========================================');
    console.log('🍎 [useUnifiedPaymentFlow] Timestamp:', new Date().toISOString());

    // Check if Apple Pay is available
    if (!window.ApplePaySession || !window.ApplePaySession.canMakePayments()) {
      const errorMsg = 'Apple Pay is only available in Safari on Apple devices';
      console.error('🍎 [useUnifiedPaymentFlow] ❌ Apple Pay not available');
      console.error('🍎 [useUnifiedPaymentFlow] Has ApplePaySession:', !!window.ApplePaySession);
      console.error('🍎 [useUnifiedPaymentFlow] Can make payments:', window.ApplePaySession?.canMakePayments?.());
      toast({
        title: "Apple Pay Not Available",
        description: errorMsg,
        variant: "destructive",
      });
      return {
        success: false,
        error: errorMsg
      };
    }

    if (!params) {
      const errorMsg = 'Payment parameters not configured';
      console.error('🍎 [useUnifiedPaymentFlow] ❌ Missing payment parameters');
      toast({
        title: "Configuration Error",
        description: errorMsg,
        variant: "destructive",
      });
      return {
        success: false,
        error: errorMsg
      };
    }

    console.log('🍎 [useUnifiedPaymentFlow] Payment Parameters:', {
      entityType: params.entityType,
      entityId: params.entityId,
      customerId: params.customerId,
      merchantId: params.merchantId,
      baseAmountCents: params.baseAmountCents,
      totalAmount: serviceFee?.totalAmountToCharge || params.baseAmountCents
    });

    return new Promise<PaymentResponse>((resolve, reject) => {
      try {
        setIsProcessingPayment(true);

        // Calculate total in dollars
        const totalAmount = serviceFee?.totalAmountToCharge || params.baseAmountCents;
        const totalPriceDollars = (totalAmount / 100).toFixed(2);

        console.log('🍎 [useUnifiedPaymentFlow] Creating payment request:', {
          totalCents: totalAmount,
          totalDollars: totalPriceDollars,
          merchantId: params.merchantId
        });

        // Create Apple Pay payment request
        const paymentRequest = {
          countryCode: "US",
          currencyCode: "USD",
          merchantCapabilities: ["supports3DS"],
          supportedNetworks: ["visa", "masterCard", "amex", "discover"],
          total: {
            label: "Muni Now Payment",
            amount: totalPriceDollars
          },
          requiredBillingContactFields: ["postalAddress"]
        };

        // Initialize Apple Pay session
        console.log('🍎 [useUnifiedPaymentFlow] Creating Apple Pay session (version 6)');
        console.log('🍎 [useUnifiedPaymentFlow] Payment request:', JSON.stringify(paymentRequest, null, 2));
        const session = new window.ApplePaySession(6, paymentRequest);

        // Add session timeout handler (5 minutes)
        const timeoutId = setTimeout(() => {
          console.error('🍎 [useUnifiedPaymentFlow] ❌ Session timeout (5 minutes)');
          session.abort();
          setIsProcessingPayment(false);
          resolve({
            success: false,
            error: 'Payment session timed out'
          });
        }, 300000);

      // Handle merchant validation
      session.onvalidatemerchant = async (event: any) => {
        console.log('🍎 [useUnifiedPaymentFlow] ========================================');
        console.log('🍎 [useUnifiedPaymentFlow] onvalidatemerchant EVENT');
        console.log('🍎 [useUnifiedPaymentFlow] ========================================');
        const validationStartTime = Date.now();
        
        try {
          const domainName = import.meta.env.VITE_APPLE_PAY_DOMAIN || window.location.hostname;
          console.log('🍎 [useUnifiedPaymentFlow] Validation details:');
          console.log('🍎 [useUnifiedPaymentFlow]   - Validation URL:', event.validationURL);
          console.log('🍎 [useUnifiedPaymentFlow]   - Domain:', domainName);
          console.log('🍎 [useUnifiedPaymentFlow]   - Merchant ID:', params.merchantId);
          console.log('🍎 [useUnifiedPaymentFlow]   - Display Name: Muni Now');
          
          console.log('🍎 [useUnifiedPaymentFlow] Calling create-apple-pay-session edge function...');
          const { data, error } = await supabase.functions.invoke('create-apple-pay-session', {
            body: {
              validation_url: event.validationURL,
              merchant_id: params.merchantId,
              domain_name: domainName,
              display_name: "Muni Now"
            }
          });
          
          const validationDuration = Date.now() - validationStartTime;
          console.log('🍎 [useUnifiedPaymentFlow] Edge function response received (Duration:', `${validationDuration}ms)`);

          if (error || !data?.session_details) {
            const errorDetails = error?.message || data?.error || JSON.stringify(data?.details) || "Unknown error";
            console.error('🍎 [useUnifiedPaymentFlow] ❌ MERCHANT VALIDATION FAILED');
            console.error('🍎 [useUnifiedPaymentFlow] Error object:', error);
            console.error('🍎 [useUnifiedPaymentFlow] Data:', data);
            console.error('🍎 [useUnifiedPaymentFlow] Error details:', errorDetails);
            console.error('🍎 [useUnifiedPaymentFlow] Domain used:', domainName);
            console.error('🍎 [useUnifiedPaymentFlow] Validation URL:', event.validationURL);
            
            // Check if it's a domain registration error
            const isDomainError = errorDetails.toLowerCase().includes('domain') && 
                                 errorDetails.toLowerCase().includes('not registered');
            
            if (isDomainError) {
              console.error('🍎 [useUnifiedPaymentFlow] 🚨 DOMAIN NOT REGISTERED ERROR');
              console.error('🍎 [useUnifiedPaymentFlow] The domain is not registered with Finix for Apple Pay');
            }
            
            session.abort();
            setIsProcessingPayment(false);
            clearTimeout(timeoutId);
            toast({
              title: "Apple Pay Validation Failed",
              description: isDomainError 
                ? `The domain "${domainName}" is not registered for Apple Pay with the payment processor. Please contact support.`
                : "Unable to validate Apple Pay merchant session. Please try again or contact support.",
              variant: "destructive",
            });
            resolve({
              success: false,
              error: isDomainError ? 'Domain not registered with payment processor' : 'Merchant validation failed'
            });
            return;
          }

          // Handle both string and object responses
          const merchantSession = typeof data.session_details === 'string' 
            ? JSON.parse(data.session_details)
            : data.session_details;

          console.log('🍎 [useUnifiedPaymentFlow] ✅ Merchant session received:');
          console.log('🍎 [useUnifiedPaymentFlow]   - Has epochTimestamp:', !!merchantSession.epochTimestamp);
          console.log('🍎 [useUnifiedPaymentFlow]   - Has signature:', !!merchantSession.signature);
          console.log('🍎 [useUnifiedPaymentFlow]   - Has merchantSessionIdentifier:', !!merchantSession.merchantSessionIdentifier);
          console.log('🍎 [useUnifiedPaymentFlow]   - Domain:', merchantSession.domainName);

          if (!merchantSession.signature || !merchantSession.merchantSessionIdentifier) {
            console.error('🍎 [useUnifiedPaymentFlow] ❌ Invalid merchant session structure');
            throw new Error('Invalid merchant session received from server');
          }

          console.log('🍎 [useUnifiedPaymentFlow] Completing merchant validation...');
          session.completeMerchantValidation(merchantSession);
          console.log('🍎 [useUnifiedPaymentFlow] ✅ Merchant validation completed successfully');
          
        } catch (err) {
          console.error('🍎 [useUnifiedPaymentFlow] ❌ Exception during merchant validation:', err);
          session.abort();
          setIsProcessingPayment(false);
          clearTimeout(timeoutId);
          toast({
            title: "Validation Error",
            description: err instanceof Error ? err.message : "Failed to validate merchant",
            variant: "destructive",
          });
          resolve({
            success: false,
            error: err instanceof Error ? err.message : 'Validation error'
          });
        }
      };

      // Handle payment authorization
      session.onpaymentauthorized = async (event: any) => {
        console.log('🍎 [useUnifiedPaymentFlow] ========================================');
        console.log('🍎 [useUnifiedPaymentFlow] onpaymentauthorized EVENT');
        console.log('🍎 [useUnifiedPaymentFlow] ========================================');
        const paymentStartTime = Date.now();
        
        try {
          console.log('🍎 [useUnifiedPaymentFlow] Payment authorized - extracting token...');
          
          const applePayToken = event.payment.token;
          const billingContact = event.payment.billingContact;
          
          console.log('🍎 [useUnifiedPaymentFlow] Token details:');
          console.log('🍎 [useUnifiedPaymentFlow]   - Token size:', JSON.stringify(applePayToken).length, 'bytes');
          console.log('🍎 [useUnifiedPaymentFlow]   - Has payment data:', !!applePayToken?.paymentData);
          console.log('🍎 [useUnifiedPaymentFlow]   - Payment method:', applePayToken?.paymentMethod?.displayName || 'Unknown');
          console.log('🍎 [useUnifiedPaymentFlow]   - Network:', applePayToken?.paymentMethod?.network || 'Unknown');
          console.log('🍎 [useUnifiedPaymentFlow] Billing contact:');
          console.log('🍎 [useUnifiedPaymentFlow]   - Name:', billingContact ? `${billingContact.givenName} ${billingContact.familyName}` : 'Not provided');
          console.log('🍎 [useUnifiedPaymentFlow]   - Email:', billingContact?.emailAddress || 'Not provided');
          console.log('🍎 [useUnifiedPaymentFlow]   - Postal Code:', billingContact?.postalCode || 'Not provided');
          console.log('🍎 [useUnifiedPaymentFlow]   - Country:', billingContact?.countryCode || 'Not provided');
          
          // Build billing address
          const billingAddress = billingContact ? {
            name: `${billingContact.givenName || ''} ${billingContact.familyName || ''}`.trim(),
            postal_code: billingContact.postalCode || '',
            country_code: billingContact.countryCode || 'US',
            locality: billingContact.locality || '',
            administrative_area: billingContact.administrativeArea || ''
          } : undefined;
          
          console.log('🍎 [useUnifiedPaymentFlow] Formatted billing address:', billingAddress || 'None');

          // Process payment in background
          console.log('🍎 [useUnifiedPaymentFlow] Processing payment through edge function...');
          
          // Get authentication token
          const { data: sessionData } = await supabase.auth.getSession();
          const authToken = sessionData.session?.access_token;

          if (!authToken) {
            console.log('🍎 [useUnifiedPaymentFlow] ⚠️ GUEST CHECKOUT MODE');
            console.log('🍎 [useUnifiedPaymentFlow] Guest email:', billingContact?.emailAddress || 'not provided');
          } else {
            console.info('🍎 [useUnifiedPaymentFlow] 🔐 AUTHENTICATED USER');
            console.info('🍎 [useUnifiedPaymentFlow] Using existing account');
          }
          
          const edgeFunctionPayload = {
            entity_type: params.entityType,
            entity_id: params.entityId,
            customer_id: params.customerId,
            merchant_id: params.merchantId,
            base_amount_cents: params.baseAmountCents,
            apple_pay_token: {
              token: applePayToken,
              billingContact: billingContact
            },
            billing_address: billingAddress,
            fraud_session_id: finixSessionKey,
            session_uuid: paymentSessionId || generateIdempotencyId('apple-pay', params.entityId),
            guest_email: billingContact?.emailAddress
          };
          
          console.log('🍎 [useUnifiedPaymentFlow] Edge function payload:', {
            ...edgeFunctionPayload,
            apple_pay_token: '***REDACTED***',
            fraud_session_id: finixSessionKey ? '***SET***' : undefined
          });
          
          console.log('🍎 [useUnifiedPaymentFlow] Calling process-unified-apple-pay...');
          const edgeFunctionStartTime = Date.now();
          let data, error;
          const invokeResult = await supabase.functions.invoke('process-unified-apple-pay', {
            body: edgeFunctionPayload,
            headers: authToken ? {
              Authorization: `Bearer ${authToken}`
            } : {}
          });
          const edgeFunctionDuration = Date.now() - edgeFunctionStartTime;
          
          console.log('🍎 [useUnifiedPaymentFlow] Edge function response received');
          console.log('🍎 [useUnifiedPaymentFlow] Duration:', `${edgeFunctionDuration}ms`);
          
          data = invokeResult.data;
          error = invokeResult.error;
          
          // Enhanced error logging for diagnostics
          if (error) {
            console.error('🍎 [useUnifiedPaymentFlow] ❌ Edge function invocation failed:', {
              message: error.message,
              status: (error as any).status,
              details: error,
              functionName: 'process-unified-apple-pay',
              duration: edgeFunctionDuration
            });
          } else {
            console.log('🍎 [useUnifiedPaymentFlow] ✅ Edge function invoked successfully');
          }
          
          // Handle 401 by refreshing token and retrying once (ONLY for authenticated users)
          if (error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
            // Only retry with token refresh for authenticated users
            // Guests shouldn't hit 401 since backend doesn't require auth
            if (authToken) {
              console.warn('⚠️ 401 error on process-unified-apple-pay, refreshing token and retrying...');
              
              const { data: refreshData } = await supabase.auth.refreshSession();
              const newToken = refreshData.session?.access_token;
              
              if (newToken) {
                console.info('🔄 Retrying process-unified-apple-pay with refreshed token');
                const retryResult = await supabase.functions.invoke('process-unified-apple-pay', {
                  body: {
                    entity_type: params.entityType,
                    entity_id: params.entityId,
                    customer_id: params.customerId,
                    merchant_id: params.merchantId,
                    base_amount_cents: params.baseAmountCents,
                    apple_pay_token: {
                      token: applePayToken,
                      billingContact: billingContact
                    },
                    billing_address: billingAddress,
                    fraud_session_id: finixSessionKey,
                    session_uuid: paymentSessionId || generateIdempotencyId('apple-pay', params.entityId),
                    guest_email: billingContact?.emailAddress
                  },
                  headers: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                data = retryResult.data;
                error = retryResult.error;
              }
            } else {
              // Guest users shouldn't hit 401 errors, but log if they do
              console.error('❌ Guest user received 401 error - this should not happen');
            }
          }
          
          console.log('🍎 [useUnifiedPaymentFlow] Response analysis:', {
            hasData: !!data,
            hasError: !!error,
            success: data?.success,
            hasTransferId: !!data?.finix_transfer_id,
            hasTransactionId: !!data?.transaction_id
          });

          if (data?.success && data?.finix_transfer_id) {
            const totalPaymentDuration = Date.now() - paymentStartTime;
            console.log('🍎 [useUnifiedPaymentFlow] ✅ ========================================');
            console.log('🍎 [useUnifiedPaymentFlow] ✅ PAYMENT SUCCESSFUL');
            console.log('🍎 [useUnifiedPaymentFlow] ✅ ========================================');
            console.log('🍎 [useUnifiedPaymentFlow] ✅ Finix Transfer ID:', data.finix_transfer_id);
            console.log('🍎 [useUnifiedPaymentFlow] ✅ Transaction ID:', data.transaction_id);
            console.log('🍎 [useUnifiedPaymentFlow] ✅ Total Duration:', `${totalPaymentDuration}ms`);
            
            toast({
              title: "Payment Successful",
              description: "Your Apple Pay payment has been processed successfully.",
            });
            
            if (params.onSuccess) {
              console.log('🍎 [useUnifiedPaymentFlow] Calling onSuccess callback...');
              await params.onSuccess(data.finix_transfer_id);
            }

            // Complete Apple Pay session with success
            console.log('🍎 [useUnifiedPaymentFlow] Completing Apple Pay session with STATUS_SUCCESS...');
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            console.log('🍎 [useUnifiedPaymentFlow] ✅ Apple Pay session completed successfully');
            clearTimeout(timeoutId);

            setIsProcessingPayment(false);
            
            resolve({
              success: true,
              transaction_id: data.finix_transfer_id,
              payment_id: data.transaction_id,
              status: 'paid'
            });
            
          } else {
            const totalPaymentDuration = Date.now() - paymentStartTime;
            console.error('🍎 [useUnifiedPaymentFlow] ❌ ========================================');
            console.error('🍎 [useUnifiedPaymentFlow] ❌ PAYMENT FAILED');
            console.error('🍎 [useUnifiedPaymentFlow] ❌ ========================================');
            console.error('🍎 [useUnifiedPaymentFlow] ❌ Data error:', data?.error);
            console.error('🍎 [useUnifiedPaymentFlow] ❌ Request error:', error);
            console.error('🍎 [useUnifiedPaymentFlow] ❌ Full data:', JSON.stringify(data, null, 2));
            console.error('🍎 [useUnifiedPaymentFlow] ❌ Total Duration:', `${totalPaymentDuration}ms`);
            
            const errorMessage = data?.error || error?.message || 'Apple Pay payment failed';
            
            toast({
              title: "Payment Failed",
              description: errorMessage,
              variant: "destructive",
            });
            
            if (params.onError) {
              const paymentError: PaymentError = {
                type: 'payment_declined',
                message: errorMessage,
                retryable: true
              };
              params.onError(paymentError);
            }

            // Complete Apple Pay session with failure
            console.log('🍎 [useUnifiedPaymentFlow] Completing Apple Pay session with STATUS_FAILURE...');
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
            console.log('🍎 [useUnifiedPaymentFlow] ❌ Apple Pay session completed with failure');
            clearTimeout(timeoutId);

            setIsProcessingPayment(false);
            
            resolve({
              success: false,
              error: errorMessage
            });
          }
          
        } catch (err) {
          console.error('🍎 [useUnifiedPaymentFlow] ❌ ========================================');
          console.error('🍎 [useUnifiedPaymentFlow] ❌ EXCEPTION IN PAYMENT PROCESSING');
          console.error('🍎 [useUnifiedPaymentFlow] ❌ ========================================');
          console.error('🍎 [useUnifiedPaymentFlow] ❌ Error Type:', err?.constructor?.name);
          console.error('🍎 [useUnifiedPaymentFlow] ❌ Error:', err);
          
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          
          toast({
            title: "Payment Error",
            description: errorMessage,
            variant: "destructive",
          });

          // Complete Apple Pay session with failure
          console.log('🍎 [useUnifiedPaymentFlow] Completing Apple Pay session with STATUS_FAILURE (exception)...');
          session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          console.log('🍎 [useUnifiedPaymentFlow] ❌ Apple Pay session completed with failure (exception)');
          clearTimeout(timeoutId);

          setIsProcessingPayment(false);
          
          resolve({
            success: false,
            error: errorMessage
          });
        }
      };

      // Handle session cancellation
      session.oncancel = (event: any) => {
        console.log('🍎 Apple Pay session cancelled by user');
        setIsProcessingPayment(false);
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: 'User cancelled payment'
        });
      };

      // Begin the session
      session.begin();
      
    } catch (error) {
      setIsProcessingPayment(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start Apple Pay session';
      
      toast({
        title: "Apple Pay Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      reject(error);
    }
  });
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