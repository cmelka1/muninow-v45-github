import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { supabase } from '@/integrations/supabase/client';
import { ServiceFee, PaymentResponse, GooglePayMerchantResponse } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId, initializeApplePaySession } from '@/utils/paymentUtils';

export const useBusinessLicensePaymentMethods = (license: any) => {
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

  const calculateServiceFee = (): ServiceFee | null => {
    if (!license) return null;
    
    const licenseAmount = license.base_fee_cents || license.total_amount_cents || 0; // A = original license amount
    
    // Use fee data directly from license (primary source)
    const basisPoints = license.basis_points;
    const fixedFee = license.fixed_fee; 
    const achBasisPoints = license.ach_basis_points;
    const achFixedFee = license.ach_fixed_fee;
    
    // If no fee data available, we can't calculate service fees
    if (!basisPoints && !achBasisPoints) return null;
    
    // Handle Google Pay and Apple Pay as special cases - always use card fees
    if (selectedPaymentMethod === 'google-pay' || selectedPaymentMethod === 'apple-pay') {
      const cardBasisPoints = basisPoints || 250;
      const cardFixedFee = fixedFee || 50;
      
      // Convert basis points to decimal percentage (p)
      const percentageDecimal = cardBasisPoints / 10000;
      
      // Prevent division by zero or invalid percentages
      if (percentageDecimal >= 1) {
        console.error('Invalid percentage fee: cannot be 100% or higher');
        return null;
      }
      
      // Apply grossed-up formula: T = (A + f) / (1 - p)
      const totalAmountToCharge = Math.round((licenseAmount + cardFixedFee) / (1 - percentageDecimal));
      const serviceFeeToDisplay = totalAmountToCharge - licenseAmount;
      
      // Calculate percentage fee for display purposes
      const percentageFee = Math.round((licenseAmount * cardBasisPoints) / 10000);

      return {
        totalFee: serviceFeeToDisplay, // Legacy compatibility
        percentageFee,
        fixedFee: cardFixedFee,
        basisPoints: cardBasisPoints,
        isCard: true,
        totalAmountToCharge,
        serviceFeeToDisplay
      };
    }
    
    if (!selectedPaymentMethod) return null;
    
    const selectedInstrument = topPaymentMethods.find(instrument => instrument.id === selectedPaymentMethod);
    if (!selectedInstrument) return null;

    const isCard = selectedInstrument.instrument_type === 'PAYMENT_CARD';
    const instrumentBasisPoints = isCard ? (basisPoints || 250) : (achBasisPoints || 20);
    const instrumentFixedFee = isCard ? (fixedFee || 50) : (achFixedFee || 50);
    
    // Convert basis points to decimal percentage (p)
    const percentageDecimal = instrumentBasisPoints / 10000;
    
    // Prevent division by zero or invalid percentages
    if (percentageDecimal >= 1) {
      console.error('Invalid percentage fee: cannot be 100% or higher');
      return null;
    }
    
    // Apply grossed-up formula: T = (A + f) / (1 - p)
    const totalAmountToCharge = Math.round((licenseAmount + instrumentFixedFee) / (1 - percentageDecimal));
    const serviceFeeToDisplay = totalAmountToCharge - licenseAmount;
    
    // Calculate percentage fee for display purposes
    const percentageFee = Math.round((licenseAmount * instrumentBasisPoints) / 10000);

    return {
      totalFee: serviceFeeToDisplay, // Legacy compatibility
      percentageFee,
      fixedFee: instrumentFixedFee,
      basisPoints: instrumentBasisPoints,
      isCard,
      totalAmountToCharge,
      serviceFeeToDisplay
    };
  };

  const serviceFee = calculateServiceFee();
  const totalWithFee = serviceFee?.totalAmountToCharge || (license?.base_fee_cents || license?.total_amount_cents) || 0;

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
      // Check if Finix library is loaded and license has merchant data
      if (typeof window !== 'undefined' && window.Finix && license?.finix_merchant_id) {
        try {
          const finixMerchantId = license.finix_merchant_id;
          console.log('Initializing Finix Auth with merchant ID:', finixMerchantId);
          
          const auth = window.Finix.Auth(
            "sandbox", // Environment
            finixMerchantId, // Merchant ID from license data
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
  }, [license?.finix_merchant_id]);

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
    if (!selectedPaymentMethod || !license) {
        toast({
          title: "Error",
          description: "Please select a payment method and ensure license details are loaded.",
          variant: "destructive",
        });
        return { success: false, error: "No payment method selected" };
    }

    // Handle regular payment methods
    if (!serviceFee) {
        toast({
          title: "Error",
          description: "Service fee calculation failed. Please try again.",
          variant: "destructive",
        });
        return { success: false, error: "Service fee calculation failed" };
    }

    try {
      setIsProcessingPayment(true);

      // Generate idempotency ID
      const idempotencyId = `${license.id}-${selectedPaymentMethod}-${Date.now()}`;

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

      console.log('Processing business license payment with fraud session ID:', currentFraudSessionId);

      const { data, error } = await supabase.functions.invoke('process-business-license-payment', {
        body: {
          license_id: license.id,
          payment_instrument_id: selectedPaymentMethod,
          total_amount_cents: totalWithFee,
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
          description: "Your business license payment has been processed successfully.",
        });
        
        // Redirect to business licenses list
        window.location.href = `/business-licenses`;
        
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
      if (!license?.merchant_finix_identity_id) {
        throw new Error('Merchant identity ID not available for this license');
      }

      if (!googlePayMerchantId) {
        throw new Error('Google Pay merchant ID not configured');
      }

      console.log('Google Pay configuration:', {
        gatewayMerchantId: license.merchant_finix_identity_id,
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
              gatewayMerchantId: license.merchant_finix_identity_id,
            },
          },
        }],
        transactionInfo: {
          countryCode: 'US' as const,
          currencyCode: 'USD' as const,
          totalPrice: (totalWithFee / 100).toFixed(2),
          totalPriceStatus: 'FINAL' as const,
        },
        merchantInfo: {
          merchantId: googlePayMerchantId,
          merchantName: license.merchant_name || 'Municipal Services',
        },
      };

      // Load payment data from Google Pay
      const paymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
      
      console.log('Google Pay payment data received:', paymentData);

      // Extract token and billing info
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

      // Generate idempotency ID
      const idempotencyId = generateIdempotencyId('googlepay_license', license.id);

      // Call our edge function to process the payment
      const { data, error } = await supabase.functions.invoke('process-business-license-google-pay-transfer', {
        body: {
          license_id: license.id,
          google_pay_token: paymentToken,
          total_amount_cents: totalWithFee,
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
          description: "Your Google Pay business license payment has been processed successfully.",
        });
        
        // Redirect to business licenses list
        window.location.href = `/business-licenses`;
        
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

      if (!license?.finix_merchant_id) {
        throw new Error('Merchant configuration not available');
      }

      const merchantName = license?.merchant_name || 'Municipality';

      const onValidateMerchant = async (event: any) => {
        const { data, error } = await supabase.functions.invoke('validate-apple-pay-merchant', {
          body: {
            validation_url: event.validationURL,
            merchant_id: license.finix_merchant_id
          }
        });
        
        if (error || !data?.success) {
          throw new Error('Merchant validation failed');
        }
        
        return data.session;
      };

      const onPaymentAuthorized = async (event: any) => {
        const idempotencyId = generateIdempotencyId('applepay_license', license.id);
        
        const { data, error } = await supabase.functions.invoke('process-business-license-apple-pay-transfer', {
          body: {
            license_id: license.id,
            apple_pay_token: event.payment.token,
            total_amount_cents: totalWithFee,
            idempotency_id: idempotencyId,
            billing_address: event.payment.billingContact
          }
        });

        if (error || !data?.success) {
          return { success: false, error: data?.error || 'Payment failed' };
        }

        // Redirect to business licenses list on success
        if (data.success) {
          toast({
            title: "Payment Successful",
            description: "Your Apple Pay business license payment has been processed successfully.",
          });
          
          // Redirect to business licenses list
          window.location.href = `/business-licenses`;
        }

        return { success: true, ...data };
      };

      const session = await initializeApplePaySession(
        license.finix_merchant_id,
        totalWithFee,
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
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    topPaymentMethods,
    paymentMethodsLoading,
    googlePayMerchantId,
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments
  };
};