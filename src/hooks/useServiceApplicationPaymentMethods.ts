import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { supabase } from '@/integrations/supabase/client';
import { ServiceFee, PaymentResponse, GooglePayMerchantResponse } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId, initializeApplePaySession } from '@/utils/paymentUtils';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';

export const useServiceApplicationPaymentMethods = (tile: MunicipalServiceTile | null, userDefinedAmount?: number) => {
  const { toast } = useToast();
  const { paymentInstruments, isLoading: paymentMethodsLoading, loadPaymentInstruments } = useUserPaymentInstruments();
  const { ensureValidSession } = useSessionValidation();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [finixAuth, setFinixAuth] = useState<any>(null);
  const [fraudSessionId, setFraudSessionId] = useState<string | null>(null);
  const [googlePayMerchantId, setGooglePayMerchantId] = useState<string | null>(null);
  const [merchantFeeProfile, setMerchantFeeProfile] = useState<any>(null);

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
    if (!tile || !merchantFeeProfile) return null;
    
    // Determine the service amount - use user defined amount if provided and allowed, otherwise use tile amount
    const serviceAmount = (tile.allow_user_defined_amount && userDefinedAmount) 
      ? userDefinedAmount * 100 // Convert to cents
      : tile.amount_cents || 0;
    
    if (serviceAmount <= 0) return null;
    
    // Get fee data from merchant fee profile
    const basisPoints = merchantFeeProfile.basis_points;
    const fixedFee = merchantFeeProfile.fixed_fee; 
    const achBasisPoints = merchantFeeProfile.ach_basis_points;
    const achFixedFee = merchantFeeProfile.ach_fixed_fee;
    
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
      const totalAmountToCharge = Math.round((serviceAmount + cardFixedFee) / (1 - percentageDecimal));
      const serviceFeeToDisplay = totalAmountToCharge - serviceAmount;
      
      // Calculate percentage fee for display purposes
      const percentageFee = Math.round((serviceAmount * cardBasisPoints) / 10000);

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
    const totalAmountToCharge = Math.round((serviceAmount + instrumentFixedFee) / (1 - percentageDecimal));
    const serviceFeeToDisplay = totalAmountToCharge - serviceAmount;
    
    // Calculate percentage fee for display purposes
    const percentageFee = Math.round((serviceAmount * instrumentBasisPoints) / 10000);

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
  const baseAmount = tile?.allow_user_defined_amount && userDefinedAmount 
    ? userDefinedAmount * 100 
    : tile?.amount_cents || 0;
  const totalWithFee = serviceFee?.totalAmountToCharge || baseAmount;

  // Auto-select default payment method when payment methods load
  useEffect(() => {
    if (!selectedPaymentMethod && topPaymentMethods.length > 0) {
      const defaultMethod = topPaymentMethods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      } else if (topPaymentMethods.length > 0) {
        // If no default, select the first available method
        setSelectedPaymentMethod(topPaymentMethods[0].id);
      }
    }
  }, [topPaymentMethods, selectedPaymentMethod]);

  // Fetch merchant fee profile when tile changes
  useEffect(() => {
    const fetchMerchantFeeProfile = async () => {
      if (!tile?.merchant_id) return;
      
      try {
        const { data, error } = await supabase
          .from('merchant_fee_profiles')
          .select('*')
          .eq('merchant_id', tile.merchant_id)
          .single();
        
        if (error) {
          console.error('Error fetching merchant fee profile:', error);
          return;
        }
        
        setMerchantFeeProfile(data);
      } catch (error) {
        console.error('Failed to fetch merchant fee profile:', error);
      }
    };

    fetchMerchantFeeProfile();
  }, [tile?.merchant_id]);

  // Initialize Finix Auth for fraud detection
  useEffect(() => {
    const initializeFinixAuth = () => {
      // Check if Finix library is loaded and tile has merchant data
      if (typeof window !== 'undefined' && window.Finix && tile?.finix_merchant_id) {
        try {
          const finixMerchantId = tile.finix_merchant_id;
          console.log('Initializing Finix Auth with merchant ID:', finixMerchantId);
          
          const auth = window.Finix.Auth(
            "sandbox", // Environment
            finixMerchantId, // Merchant ID from tile data
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
  }, [tile?.finix_merchant_id]);

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

  const handlePayment = async (applicationId: string): Promise<PaymentResponse> => {
    console.log('Processing service application payment:', {
      applicationId,
      selectedPaymentMethod,
      totalWithFee,
      serviceFee
    });
    
    // Validate session and selected payment method
    if (!selectedPaymentMethod || !tile) {
      const errorMsg = "Please select a payment method and ensure service details are loaded.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return { success: false, error: errorMsg, retryable: false };
    }

    // Validate session before processing payment
    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        return { success: false, error: "Session validation failed", retryable: false };
      }
    } catch (sessionError) {
      console.error('Session validation error:', sessionError);
      return { success: false, error: "Session validation failed", retryable: false };
    }

    if (!serviceFee || totalWithFee <= 0) {
      const errorMsg = "Service fee calculation failed. Please try again.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return { success: false, error: errorMsg, retryable: false };
    }

    setIsProcessingPayment(true);

    try {
      // Generate idempotency ID for payment safety
      const idempotencyId = generateIdempotencyId('service-app', applicationId);
      console.log('Generated idempotency ID:', idempotencyId);

      const { data, error } = await supabase.functions.invoke('process-service-application-payment', {
        body: {
          application_id: applicationId,
          payment_instrument_id: selectedPaymentMethod,
          total_amount_cents: totalWithFee,
          idempotency_id: idempotencyId,
          fraud_session_id: fraudSessionId,
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        const classifiedError = classifyPaymentError(error);
        
        toast({
          title: "Payment Failed",
          description: classifiedError.message,
          variant: "destructive",
        });
        
        return {
          success: false,
          error: classifiedError.message,
          retryable: classifiedError.retryable,
        };
      }

      // Enhanced response validation - check for actual response structure
      console.log('Raw payment response:', data);
      
      // Check if we have a valid response structure
      if (!data) {
        const errorMsg = "No response received from payment service";
        console.error('Empty payment response');
        
        toast({
          title: "Payment Failed",
          description: errorMsg,
          variant: "destructive",
        });
        
        return {
          success: false,
          error: errorMsg,
          retryable: true,
        };
      }

      // Check for explicit failure in response
      if (data.success === false || data.error) {
        const errorMsg = data.error || "Payment processing failed";
        console.error('Payment failed with error:', data);
        
        toast({
          title: "Payment Failed",
          description: errorMsg,
          variant: "destructive",
        });
        
        return {
          success: false,
          error: errorMsg,
          retryable: true,
        };
      }

      // Check for successful payment indicators - backend returns 'paid' not 'completed'
      if (data.success === true || data.payment_id || data.transfer_id || data.payment_status === 'paid') {
        console.log('Payment processed successfully:', data);
        
        const successMessage = data.auto_approved 
          ? "Your payment has been processed and your application has been approved!"
          : "Your payment has been processed. Your application is now under review.";
        
        toast({
          title: "Payment Successful",
          description: successMessage,
        });

        return {
          success: true,
          payment_id: data.payment_id,
          transaction_id: data.transfer_id,
          status: data.payment_status,
        };
      }

      // Handle edge case where response structure is unexpected
      console.warn('Unexpected payment response structure:', data);
      const warningMsg = "Payment status unclear. Please check your payment history.";
      
      toast({
        title: "Payment Processing",
        description: warningMsg,
        variant: "default",
      });

      return {
        success: false,
        error: warningMsg,
        retryable: true,
      };

    } catch (error) {
      console.error('Unexpected payment error:', error);
      const classifiedError = classifyPaymentError(error);
      
      toast({
        title: "Payment Failed",
        description: classifiedError.message,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: classifiedError.message,
        retryable: classifiedError.retryable,
      };
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGooglePayment = async (applicationId: string): Promise<PaymentResponse> => {
    console.log('Processing Google Pay service application payment:', {
      applicationId,
      totalWithFee,
      serviceFee
    });
    
    if (!tile || !googlePayMerchantId) {
      const errorMsg = "Google Pay is not properly configured.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return { success: false, error: errorMsg, retryable: false };
    }

    // Validate session before processing payment
    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        return { success: false, error: "Session validation failed", retryable: false };
      }
    } catch (sessionError) {
      console.error('Session validation error:', sessionError);
      return { success: false, error: "Session validation failed", retryable: false };
    }

    if (!serviceFee || totalWithFee <= 0) {
      const errorMsg = "Service fee calculation failed. Please try again.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return { success: false, error: errorMsg, retryable: false };
    }

    setIsProcessingPayment(true);

    try {
      // Configure Google Pay payment request
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD' as const,
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY' as const,
            parameters: {
              gateway: 'finix' as const,
              gatewayMerchantId: googlePayMerchantId
            }
          }
        }],
        transactionInfo: {
          countryCode: 'US',
          currencyCode: 'USD',
          totalPrice: (totalWithFee / 100).toFixed(2),
          totalPriceStatus: 'FINAL' as const
        },
        merchantInfo: {
          merchantId: googlePayMerchantId,
          merchantName: tile.title
        }
      };

      // Load payment data from Google Pay
      const paymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

      // Generate idempotency ID for payment safety
      const idempotencyId = generateIdempotencyId('service-app-googlepay', applicationId);
      console.log('Generated Google Pay idempotency ID:', idempotencyId);

      const { data, error } = await supabase.functions.invoke('process-service-application-google-pay', {
        body: {
          application_id: applicationId,
          google_pay_token: paymentToken,
          billing_contact: billingAddress,
          total_amount_cents: totalWithFee,
          idempotency_id: idempotencyId,
          fraud_session_id: fraudSessionId,
        }
      });

      if (error) {
        console.error('Google Pay Supabase function error:', error);
        const classifiedError = classifyPaymentError(error);
        
        toast({
          title: "Payment Failed",
          description: classifiedError.message,
          variant: "destructive",
        });
        
        return {
          success: false,
          error: classifiedError.message,
          retryable: classifiedError.retryable,
        };
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || "Google Pay payment failed. Please try again.";
        console.error('Google Pay data error:', data);
        
        toast({
          title: "Payment Failed",
          description: errorMsg,
          variant: "destructive",
        });
        
        return {
          success: false,
          error: errorMsg,
          retryable: true,
        };
      }

      console.log('Google Pay payment processed successfully:', data);
      
      const successMessage = data.auto_approved 
        ? "Your Google Pay payment has been processed and your application has been approved!"
        : "Your Google Pay payment has been processed. Your application is now under review.";
      
      toast({
        title: "Payment Successful",
        description: successMessage,
      });

      return {
        success: true,
        payment_id: data.payment_id,
        transaction_id: data.transfer_id,
        status: data.payment_status,
      };

    } catch (error: any) {
      console.error('Google Pay payment error:', error);
      
      // Handle user cancellation
      if (error?.statusCode === 'CANCELED') {
        return {
          success: false,
          error: "Payment cancelled by user",
          retryable: true,
        };
      }
      
      const classifiedError = classifyPaymentError(error);
      
      toast({
        title: "Payment Failed",
        description: classifiedError.message,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: classifiedError.message,
        retryable: classifiedError.retryable,
      };
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleApplePayment = async (applicationId: string): Promise<PaymentResponse> => {
    console.log('Processing Apple Pay service application payment:', {
      applicationId,
      totalWithFee,
      serviceFee
    });
    
    if (!tile) {
      toast({
        title: "Error",
        description: "Service application details not loaded.",
        variant: "destructive",
      });
      return { success: false, error: "Service not loaded", retryable: false };
    }

    // Check Apple Pay availability
    if (!window.ApplePaySession || !(window.ApplePaySession as any).canMakePayments()) {
      toast({
        title: "Apple Pay Unavailable",
        description: "Apple Pay is not available on this device.",
        variant: "destructive",
      });
      return { success: false, error: "Apple Pay not available", retryable: false };
    }

    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    if (!sessionValid) {
      return { success: false, error: "Session validation failed", retryable: false };
    }

    if (!serviceFee || totalWithFee <= 0) {
      toast({
        title: "Error",
        description: "Service fee calculation failed. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "Invalid payment amount", retryable: false };
    }

    try {
      setIsProcessingPayment(true);

      // Initialize Apple Pay session
      const session = await initializeApplePaySession(
        'merchant.muninow.com',
        totalWithFee,
        tile.title,
        async (event: any) => {
          // Validate merchant
          const { data } = await supabase.functions.invoke('validate-apple-pay-merchant', {
            body: {
              validation_url: event.validationURL,
              merchant_id: 'merchant.muninow.com'
            }
          });
          return data.session;
        },
        async (event: any) => {
          try {
            const paymentToken = event.payment.token;
            const billingContact = event.payment.billingContact;

            // Generate idempotency ID for payment safety
            const idempotencyId = generateIdempotencyId('service-app-applepay', applicationId);

            const { data, error } = await supabase.functions.invoke('process-service-application-apple-pay', {
              body: {
                application_id: applicationId,
                apple_pay_token: JSON.stringify(paymentToken),
                billing_contact: billingContact,
                total_amount_cents: totalWithFee,
                idempotency_id: idempotencyId,
                fraud_session_id: fraudSessionId,
              }
            });

            if (error || !data.success) {
              console.error('Apple Pay processing error:', error || data.error);
              session.completePayment((window.ApplePaySession as any).STATUS_FAILURE);
              return {
                success: false,
                error: error?.message || data.error || "Apple Pay processing failed",
                retryable: true,
              };
            }

            console.log('Apple Pay payment processed successfully:', data);
            session.completePayment((window.ApplePaySession as any).STATUS_SUCCESS);
            
            toast({
              title: "Payment Successful",
              description: "Your Apple Pay payment has been processed. Your application is now under review.",
            });

            return {
              success: true,
              payment_id: data.payment_id,
              transaction_id: data.transfer_id,
              status: data.payment_status,
            };

          } catch (processingError) {
            console.error('Apple Pay processing error:', processingError);
            session.completePayment((window.ApplePaySession as any).STATUS_FAILURE);
            throw processingError;
          }
        }
      );

      // The session handles the payment flow
      return new Promise((resolve) => {
        // This will be resolved by the session event handlers
        session.oncancel = () => {
          resolve({
            success: false,
            error: "Payment cancelled by user",
            retryable: true,
          });
        };
      });

    } catch (error: any) {
      console.error('Apple Pay payment error:', error);
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred with Apple Pay. Please try again.",
        variant: "destructive",
      });
      return {
        success: false,
        error: "Apple Pay payment failed",
        retryable: true,
      };
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
    baseAmount,
    paymentInstruments,
    topPaymentMethods,
    paymentMethodsLoading,
    googlePayMerchantId,
    merchantFeeProfile,
    
    // Actions
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments,
  };
};