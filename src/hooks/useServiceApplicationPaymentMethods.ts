import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { useServiceFeeCalculation } from '@/hooks/useServiceFeeCalculation';
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

  const baseAmount = tile?.allow_user_defined_amount && userDefinedAmount 
    ? userDefinedAmount * 100 
    : tile?.amount_cents || 0;
  
  // Use service fee calculation hook for frontend display
  const { totalAmount, serviceFee: calculatedServiceFee, isLoading: feeCalculationLoading } = useServiceFeeCalculation(
    baseAmount, 
    selectedPaymentMethod
  );
  
  // Convert to legacy format for compatibility
  const serviceFee: ServiceFee | null = calculatedServiceFee ? {
    totalFee: calculatedServiceFee,
    percentageFee: calculatedServiceFee,
    fixedFee: 50, // Default fixed fee
    basisPoints: 300, // Default basis points
    isCard: true, // Will be determined by backend
    totalAmountToCharge: totalAmount,
    serviceFeeToDisplay: calculatedServiceFee
  } : null;
  
  const totalWithFee = totalAmount || baseAmount;

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

  const handlePaymentWithData = async (applicationData: any): Promise<PaymentResponse> => {
    console.log('Processing service application payment with data:', {
      applicationData,
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

    if (totalWithFee <= 0) {
      const errorMsg = "Invalid payment amount. Please try again.";
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

      // Enhanced response validation with JSON parsing support
      console.log('Raw payment response:', data);
      console.log('Response type:', typeof data);
      
      // Parse response if it's a string (sometimes Supabase functions return JSON strings)
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
          console.log('Parsed string response to object:', parsedData);
        } catch (parseError) {
          console.error('Failed to parse response string:', parseError);
          // Fall back to treating it as an error
          const errorMsg = "Invalid response format from payment service";
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
      }
      
      // Check if we have a valid response structure
      if (!parsedData) {
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
      if (parsedData.success === false || parsedData.error) {
        const errorMsg = parsedData.error || "Payment processing failed";
        console.error('Payment failed with error:', parsedData);
        
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

      // Enhanced success detection with multiple fallback methods
      console.log('=== PAYMENT RESPONSE ANALYSIS ===');
      console.log('Parsed data:', JSON.stringify(parsedData, null, 2));
      
      // Primary success check
      const hasExplicitSuccess = parsedData?.success === true;
      const hasPaymentId = !!(parsedData?.payment_history_id || parsedData?.payment_id);
      const hasTransferId = !!(parsedData?.transfer_id || parsedData?.transaction_id);
      const hasValidStatus = parsedData?.status === 'completed' || parsedData?.transfer_state === 'SUCCEEDED';
      
      // Multiple success detection methods
      const isSuccess = hasExplicitSuccess || 
                       (hasPaymentId && hasTransferId) ||
                       (hasPaymentId && hasValidStatus) ||
                       hasValidStatus;
      
      console.log('Success analysis:', {
        hasExplicitSuccess,
        hasPaymentId,
        hasTransferId,
        hasValidStatus,
        'overall_success': isSuccess
      });
      
      if (isSuccess) {
        console.log('✅ Payment processed successfully');
        
        const successMessage = parsedData.auto_approved 
          ? "Your payment has been processed and your application has been approved!"
          : "Your payment has been processed. Your application is now under review.";
        
        toast({
          title: "Payment Successful",
          description: successMessage,
        });

        return {
          success: true,
          payment_id: parsedData.payment_history_id || parsedData.payment_id,
          transaction_id: parsedData.transfer_id || parsedData.transaction_id,
          status: parsedData.transfer_state || parsedData.status || 'paid',
        };
      }

      // Handle edge case where response structure is unexpected
      console.warn('❌ Payment status unclear - no clear success indicators found');
      console.warn('Full response structure:', JSON.stringify(parsedData, null, 2));
      const warningMsg = "Payment status unclear. Please check your payment history or contact support.";
      
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

    if (totalWithFee <= 0) {
      const errorMsg = "Invalid payment amount. Please try again.";
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

    if (totalWithFee <= 0) {
      toast({
        title: "Error",
        description: "Invalid payment amount. Please try again.",
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