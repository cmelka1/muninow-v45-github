import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { supabase } from '@/integrations/supabase/client';
import { ServiceFee, PaymentResponse, GooglePayMerchantResponse, PaymentMethodHookReturn } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId, initializeApplePaySession } from '@/utils/paymentUtils';

export const usePaymentMethods = (bill: any): PaymentMethodHookReturn => {
  const { toast } = useToast();
  const { paymentInstruments, isLoading: paymentMethodsLoading, loadPaymentInstruments } = useUserPaymentInstruments();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [finixAuth, setFinixAuth] = useState<any>(null);
  const [fraudSessionId, setFraudSessionId] = useState<string | null>(null);
  const [googlePayMerchantId, setGooglePayMerchantId] = useState<string | null>(null);

  // Get top 3 payment methods (prioritize default, then by creation date)
  const topPaymentMethods = paymentInstruments
    .slice()
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 3);

  // Service fee calculation is now handled by the backend
  // Frontend only displays the base amount and lets backend calculate fees
  const serviceFee = null; // Removed frontend calculation
  const totalWithFee = bill?.total_amount_cents || 0; // Base amount only

  // Auto-select default payment method when payment methods load
  useEffect(() => {
    if (!selectedPaymentMethod && topPaymentMethods.length > 0) {
      const defaultMethod = topPaymentMethods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      }
    }
  }, [topPaymentMethods, selectedPaymentMethod]);

  // Initialize Finix Auth for fraud detection
  useEffect(() => {
    const initializeFinixAuth = () => {
      // Check if Finix library is loaded and bill data is available
      if (typeof window !== 'undefined' && window.Finix && bill?.finix_merchant_id) {
        try {
          console.log('Initializing Finix Auth with merchant ID:', bill.finix_merchant_id);
          
          const auth = window.Finix.Auth(
            "sandbox", // Environment
            bill.finix_merchant_id, // Merchant ID from bill data
            (sessionKey: string) => {
              console.log('Finix Auth initialized with session key:', sessionKey);
              setFraudSessionId(sessionKey);
            }
          );
          
          setFinixAuth(auth);
          
          // Also get session key immediately if available
          try {
            const immediateSessionKey = auth.getSessionKey();
            if (immediateSessionKey) {
              setFraudSessionId(immediateSessionKey);
            }
          } catch (error) {
            console.log('Session key not immediately available, will wait for callback');
          }
        } catch (error) {
          console.error('Error initializing Finix Auth:', error);
        }
      }
    };

    // Try to initialize immediately
    initializeFinixAuth();

    // If Finix library is not loaded yet, retry after a short delay
    if (!window.Finix) {
      const retryTimeout = setTimeout(initializeFinixAuth, 1000);
      return () => clearTimeout(retryTimeout);
    }
  }, [bill?.finix_merchant_id]);

  // Fetch Google Pay merchant ID
  useEffect(() => {
    const fetchGooglePayMerchantId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-pay-merchant-id', {
          body: { merchant_id: bill?.merchant_id }
        });
        
        if (error) {
          console.error('Error fetching Google Pay merchant ID:', error);
          return;
        }
        
        const response = data as GooglePayMerchantResponse;
        if (response?.merchant_id) {
          setGooglePayMerchantId(response.merchant_id);
          console.log('Google Pay merchant ID fetched:', response.merchant_id);
        } else {
          console.warn('Google Pay merchant ID not configured');
        }
      } catch (error) {
        console.error('Failed to fetch Google Pay merchant ID:', error);
      }
    };

    if (bill?.merchant_id) {
      fetchGooglePayMerchantId();
    }
  }, [bill?.merchant_id]);

  const handlePayment = async () => {
    if (!selectedPaymentMethod || !bill) {
      toast({
        title: "Error",
        description: "Please select a payment method and ensure bill details are loaded.",
        variant: "destructive",
      });
      return;
    }

    // Backend will calculate service fees, so just validate bill amount exists
    if (!bill?.total_amount_cents) {
      toast({
        title: "Error",
        description: "Bill amount not available. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessingPayment(true);

      // Generate idempotency ID
      const idempotencyId = generateIdempotencyId('payment', bill.bill_id);

      // Get current fraud session ID
      let currentFraudSessionId = fraudSessionId;
      if (finixAuth && !currentFraudSessionId) {
        try {
          currentFraudSessionId = finixAuth.getSessionKey();
          setFraudSessionId(currentFraudSessionId);
        } catch (error) {
          console.warn('Could not get fraud session ID:', error);
        }
      }

      console.log('Processing payment with fraud session ID:', currentFraudSessionId);

      const { data, error } = await supabase.functions.invoke('process-finix-transfer', {
        body: {
          bill_id: bill.bill_id,
          payment_instrument_id: selectedPaymentMethod,
          base_amount_cents: bill.total_amount_cents,
          idempotency_id: idempotencyId,
          fraud_session_id: currentFraudSessionId
        }
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Failed",
          description: "There was an error processing your payment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        
        return { success: true, ...data };
      } else {
        toast({
          title: "Payment Failed",
          description: data.error || "Payment processing failed. Please try again.",
          variant: "destructive",
        });
        return { success: false };
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGooglePayment = async () => {
    try {
      setIsProcessingPayment(true);

      // Check if Google Pay is available
      if (!window.googlePayClient) {
        throw new Error('Google Pay is not available');
      }

      // Validate required merchant IDs
      if (!bill.merchant_finix_identity_id) {
        throw new Error('Merchant identity ID not available for this bill');
      }

      if (!googlePayMerchantId) {
        throw new Error('Google Pay merchant ID not configured');
      }

      console.log('Google Pay configuration:', {
        gatewayMerchantId: googlePayMerchantId,
        merchantId: googlePayMerchantId
      });

      // Define payment request
      const allowedAuthMethods: string[] = ["PAN_ONLY", "CRYPTOGRAM_3DS"];
      const allowedCardNetworks: string[] = ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"];
      
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: "CARD" as const,
          parameters: {
            allowedAuthMethods,
            allowedCardNetworks,
          },
          tokenizationSpecification: {
            type: "PAYMENT_GATEWAY" as const,
            parameters: {
              gateway: "finix" as const,
              gatewayMerchantId: googlePayMerchantId,
            },
          },
        }],
          transactionInfo: {
            countryCode: 'US' as const,
            currencyCode: 'USD' as const,
            totalPrice: (bill.total_amount_cents / 100).toFixed(2), // Base amount only, backend calculates fees
            totalPriceStatus: 'FINAL' as const,
          },
        merchantInfo: {
          merchantId: googlePayMerchantId, // Use Google Pay merchant ID
          merchantName: bill.merchant_name || bill.business_legal_name || 'Merchant',
        },
      };

      // Load payment data from Google Pay
      const paymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
      
      console.log('Google Pay payment data received:', paymentData);

      // Extract token and billing info
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

      // Generate idempotency ID
      const idempotencyId = generateIdempotencyId('googlepay', bill.bill_id);

      // Call our edge function to process the payment
      const { data, error } = await supabase.functions.invoke('process-google-pay-transfer', {
        body: {
          bill_id: bill.bill_id,
          google_pay_token: paymentToken,
          base_amount_cents: bill.total_amount_cents,
          idempotency_id: idempotencyId,
          billing_address: billingAddress ? {
            name: billingAddress.name,
            postal_code: billingAddress.postalCode,
            country: billingAddress.countryCode
          } : undefined
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Payment Successful",
          description: "Your Google Pay payment has been processed successfully.",
        });
        return { success: true, ...data };
      } else {
        throw new Error(data?.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Google Pay payment error:', error);
      
      const classifiedError = classifyPaymentError(error);
      
      if (classifiedError.type !== 'user_cancelled') {
        toast({
          title: "Payment Failed",
          description: classifiedError.message,
          variant: "destructive",
        });
      }
      return { success: false, error: classifiedError.message };
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleApplePayment = async (): Promise<PaymentResponse> => {
    try {
      setIsProcessingPayment(true);

      if (!window.ApplePaySession?.canMakePayments()) {
        throw new Error('Apple Pay is not available on this device');
      }

      if (!bill?.merchant_finix_identity_id) {
        throw new Error('Merchant configuration not available');
      }

      const merchantName = bill.merchant_name || bill.business_legal_name || 'Merchant';

      const onValidateMerchant = async (event: any) => {
        const { data, error } = await supabase.functions.invoke('validate-apple-pay-merchant', {
          body: {
            validation_url: event.validationURL,
            merchant_id: bill.merchant_finix_identity_id
          }
        });
        
        if (error || !data?.success) {
          throw new Error('Merchant validation failed');
        }
        
        return data.session;
      };

      const onPaymentAuthorized = async (event: any) => {
        const idempotencyId = generateIdempotencyId('applepay', bill.bill_id);
        
        const { data, error } = await supabase.functions.invoke('process-apple-pay-transfer', {
          body: {
            bill_id: bill.bill_id,
            apple_pay_token: event.payment.token,
            base_amount_cents: bill.total_amount_cents,
            idempotency_id: idempotencyId,
            billing_address: event.payment.billingContact
          }
        });

        if (error || !data?.success) {
          return { success: false, error: data?.error || 'Payment failed' };
        }

        toast({
          title: "Payment Successful",
          description: "Your Apple Pay payment has been processed successfully.",
        });

        return { success: true, ...data };
      };

      const session = await initializeApplePaySession(
        bill.merchant_finix_identity_id,
        bill.total_amount_cents, // Base amount only, backend calculates fees
        merchantName,
        onValidateMerchant,
        onPaymentAuthorized
      );

      session.begin();
      
      // Return promise that resolves when session completes
      return new Promise((resolve) => {
        session.oncancel = () => {
          resolve({ success: false, error: 'Payment was cancelled' });
        };
      });

    } catch (error) {
      console.error('Apple Pay payment error:', error);
      const classifiedError = classifyPaymentError(error);
      
      if (classifiedError.type !== 'user_cancelled') {
        toast({
          title: "Payment Failed",
          description: classifiedError.message,
          variant: "destructive",
        });
      }
      return { success: false, error: classifiedError.message };
    } finally {
      setIsProcessingPayment(false);
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
    loadPaymentInstruments,
  };
};