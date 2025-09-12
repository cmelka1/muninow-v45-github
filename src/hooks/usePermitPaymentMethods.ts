import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { supabase } from '@/integrations/supabase/client';
import { ServiceFee, PaymentResponse, GooglePayMerchantResponse } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId, initializeApplePaySession } from '@/utils/paymentUtils';
import { useSessionValidation } from '@/hooks/useSessionValidation';

export const usePermitPaymentMethods = (permit: any) => {
  const { toast } = useToast();
  const { paymentInstruments, isLoading: paymentMethodsLoading, loadPaymentInstruments } = useUserPaymentInstruments();
  const { ensureValidSession } = useSessionValidation();
  
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
  const totalWithFee = permit?.base_fee_cents || permit?.total_amount_cents || 0; // Base amount only

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
      // Check if Finix library is loaded and permit has merchant data
      if (typeof window !== 'undefined' && window.Finix && permit?.finix_merchant_id) {
        try {
          const finixMerchantId = permit.finix_merchant_id;
          console.log('Initializing Finix Auth with merchant ID:', finixMerchantId);
          
          const auth = window.Finix.Auth(
            "sandbox", // Environment
            finixMerchantId, // Merchant ID from permit data
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
  }, [permit?.finix_merchant_id]);

  // Fetch Google Pay merchant ID
  useEffect(() => {
    const fetchGooglePayMerchantId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-pay-merchant-id');
        
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

    fetchGooglePayMerchantId();
  }, []);

  const handlePayment = async (): Promise<PaymentResponse> => {
    if (!selectedPaymentMethod || !permit) {
        toast({
          title: "Error",
          description: "Please select a payment method and ensure permit details are loaded.",
          variant: "destructive",
        });
        return { success: false, error: "No payment method selected" };
    }

    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    
    if (!sessionValid) {
      return { success: false, error: "Session validation failed" };
    }

    // Backend will calculate service fees, so just validate permit amount exists
    if (!permit?.base_fee_cents && !permit?.total_amount_cents) {
        toast({
          title: "Error",
          description: "Permit amount not available. Please try again.",
          variant: "destructive",
        });
        return { success: false, error: "Permit amount not available" };
    }

    try {
      setIsProcessingPayment(true);

      // Generate idempotency ID
      const idempotencyId = `${permit.permit_id}-${selectedPaymentMethod}-${Date.now()}`;

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

      // Validate fraud session ID is available
      if (!currentFraudSessionId) {
        toast({
          title: "Error",
          description: "Fraud protection is not available. Please refresh the page and try again.",
          variant: "destructive",
        });
        return { success: false, error: "Fraud protection not available" };
      }

      console.log('Processing permit payment with fraud session ID:', currentFraudSessionId);

      const { data, error } = await supabase.functions.invoke('process-permit-payment', {
        body: {
          permit_id: permit.permit_id,
          payment_instrument_id: selectedPaymentMethod,
          base_amount_cents: permit.base_fee_cents || permit.total_amount_cents,
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
        return { success: false, error: "Payment processing error" };
      }

      if (data.success) {
        toast({
          title: "Payment Successful",
          description: "Your permit payment has been processed successfully.",
        });
        
        // Redirect to certificate page if permit is issued
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          // Fallback: redirect to certificate page directly
          window.location.href = `/permit/${permit.permit_id}/certificate`;
        }
        
        return { success: true, ...data };
      } else {
        toast({
          title: "Payment Failed",
          description: data.error || "Payment processing failed. Please try again.",
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "Unexpected error occurred" };
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGooglePayment = async (): Promise<PaymentResponse> => {
    try {
      setIsProcessingPayment(true);

      // Check if Google Pay is available
      if (!window.googlePayClient) {
        throw new Error('Google Pay is not available');
      }

      // Validate required merchant IDs
      if (!permit?.merchant_finix_identity_id) {
        throw new Error('Merchant identity ID not available for this permit');
      }

      if (!googlePayMerchantId) {
        throw new Error('Google Pay merchant ID not configured');
      }

      console.log('Google Pay configuration:', {
        gatewayMerchantId: permit.merchant_finix_identity_id,
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
              gatewayMerchantId: permit.merchant_finix_identity_id,
            },
          },
        }],
        transactionInfo: {
          countryCode: 'US' as const,
          currencyCode: 'USD' as const,
          totalPrice: ((permit.base_fee_cents || permit.total_amount_cents) / 100).toFixed(2), // Base amount only
          totalPriceStatus: 'FINAL' as const,
        },
        merchantInfo: {
          merchantId: googlePayMerchantId,
          merchantName: permit.merchant_name || 'Municipal Services',
        },
      };

      // Load payment data from Google Pay
      const paymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
      
      console.log('Google Pay payment data received:', paymentData);

      // Extract token and billing info
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

      // Generate idempotency ID
      const idempotencyId = generateIdempotencyId('unified_googlepay_permit', permit.permit_id);

      // Call the new unified Google Pay edge function
      const { data, error } = await supabase.functions.invoke('process-unified-google-pay', {
        body: {
          entity_type: 'permit',
          entity_id: permit.permit_id,
          customer_id: permit.customer_id,
          merchant_id: permit.merchant_id,
          base_amount_cents: permit.base_fee_cents || permit.total_amount_cents,
          google_pay_token: paymentToken,
          billing_address: billingAddress ? {
            name: billingAddress.name,
            postal_code: billingAddress.postalCode,
            country_code: billingAddress.countryCode
          } : undefined,
          fraud_session_id: fraudSessionId,
          first_name: permit.first_name,
          last_name: permit.last_name,
          user_email: permit.email
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Payment Successful",
          description: "Your Google Pay permit payment has been processed successfully.",
        });
        
        // Redirect to certificate page
        window.location.href = `/permit/${permit.permit_id}/certificate`;
        
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
      if (!window.ApplePaySession?.canMakePayments()) {
        throw new Error('Apple Pay is not available on this device');
      }

      if (!permit?.finix_merchant_id) {
        throw new Error('Merchant configuration not available');
      }

      const merchantName = permit?.merchant_name || 'Municipality';

      const onValidateMerchant = async (event: any) => {
        const { data, error } = await supabase.functions.invoke('validate-apple-pay-merchant', {
          body: {
            validation_url: event.validationURL,
            merchant_id: permit.finix_merchant_id
          }
        });
        
        if (error || !data?.success) {
          throw new Error('Merchant validation failed');
        }
        
        return data.session;
      };

      const onPaymentAuthorized = async (event: any) => {
        const idempotencyId = generateIdempotencyId('applepay_permit', permit.permit_id);
        
        const { data, error } = await supabase.functions.invoke('process-permit-apple-pay-transfer', {
          body: {
            permit_id: permit.permit_id,
            apple_pay_token: event.payment.token,
            base_amount_cents: permit.base_fee_cents || permit.total_amount_cents,
            idempotency_id: idempotencyId,
            billing_address: event.payment.billingContact
          }
        });

        if (error || !data?.success) {
          return { success: false, error: data?.error || 'Payment failed' };
        }

        // Redirect to certificate page on success
        if (data.success) {
          toast({
            title: "Payment Successful",
            description: "Your Apple Pay permit payment has been processed successfully.",
          });
          
          // Redirect to certificate page
          window.location.href = `/permit/${permit.permit_id}/certificate`;
        }

        return { success: true, ...data };
      };

      const session = await initializeApplePaySession(
        permit.finix_merchant_id,
        permit.base_fee_cents || permit.total_amount_cents, // Base amount only
        merchantName,
        onValidateMerchant,
        onPaymentAuthorized
      );

      session.begin();
      
      return new Promise((resolve) => {
        session.oncancel = () => {
          resolve({ success: false, error: 'Payment was cancelled' });
        };
      });

    } catch (error) {
      console.error('Apple Pay payment error:', error);
      const classifiedError = classifyPaymentError(error);
      return { success: false, error: classifiedError.message };
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