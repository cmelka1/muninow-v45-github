import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { supabase } from '@/integrations/supabase/client';

interface ServiceFee {
  totalFee: number; // Legacy - same as serviceFeeToDisplay
  percentageFee: number;
  fixedFee: number;
  basisPoints: number;
  isCard: boolean;
  totalAmountToCharge: number; // The grossed-up amount (T)
  serviceFeeToDisplay: number; // The fee amount shown to user (T - A)
}

export const usePermitPaymentMethods = (permit: any) => {
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
    if (!permit) return null;
    
    const permitAmount = permit.base_fee_cents || permit.total_amount_cents || 0; // A = original permit amount
    
    // Use fee data directly from permit (primary source)
    // Fee data is available directly in permit_applications table
    const basisPoints = permit.basis_points;
    const fixedFee = permit.fixed_fee; 
    const achBasisPoints = permit.ach_basis_points;
    const achFixedFee = permit.ach_fixed_fee;
    
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
      const totalAmountToCharge = Math.round((permitAmount + cardFixedFee) / (1 - percentageDecimal));
      const serviceFeeToDisplay = totalAmountToCharge - permitAmount;
      
      // Calculate percentage fee for display purposes
      const percentageFee = Math.round((permitAmount * cardBasisPoints) / 10000);

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
    const totalAmountToCharge = Math.round((permitAmount + instrumentFixedFee) / (1 - percentageDecimal));
    const serviceFeeToDisplay = totalAmountToCharge - permitAmount;
    
    // Calculate percentage fee for display purposes
    const percentageFee = Math.round((permitAmount * instrumentBasisPoints) / 10000);

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
  const totalWithFee = serviceFee?.totalAmountToCharge || (permit?.base_fee_cents || permit?.total_amount_cents) || 0;

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
      if (typeof window !== 'undefined' && window.Finix && permit?.municipal_permit_merchants?.merchants?.finix_merchant_id) {
        try {
          const finixMerchantId = permit.municipal_permit_merchants.merchants.finix_merchant_id;
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
  }, [permit?.municipal_permit_merchants?.merchants?.finix_merchant_id]);

  // Fetch Google Pay merchant ID
  useEffect(() => {
    const fetchGooglePayMerchantId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-pay-merchant-id');
        
        if (error) {
          console.error('Error fetching Google Pay merchant ID:', error);
          return;
        }
        
        if (data?.merchant_id) {
          setGooglePayMerchantId(data.merchant_id);
          console.log('Google Pay merchant ID fetched:', data.merchant_id);
        } else {
          console.warn('Google Pay merchant ID not configured');
        }
      } catch (error) {
        console.error('Failed to fetch Google Pay merchant ID:', error);
      }
    };

    fetchGooglePayMerchantId();
  }, []);

  const handlePayment = async (): Promise<void> => {
    if (!selectedPaymentMethod || !permit) {
      toast({
        title: "Error",
        description: "Please select a payment method and ensure permit details are loaded.",
        variant: "destructive",
      });
      return;
    }

    // Handle regular payment methods
    if (!serviceFee) {
      toast({
        title: "Error",
        description: "Service fee calculation failed. Please try again.",
        variant: "destructive",
      });
      return;
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

      console.log('Processing permit payment with fraud session ID:', currentFraudSessionId);

      const { data, error } = await supabase.functions.invoke('process-permit-payment', {
        body: {
          permit_id: permit.permit_id,
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
        return;
      }

      if (data.success) {
        toast({
          title: "Payment Successful",
          description: "Your permit payment has been processed successfully.",
        });
      } else {
        toast({
          title: "Payment Failed",
          description: data.error || "Payment processing failed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGooglePayment = async (): Promise<void> => {
    try {
      setIsProcessingPayment(true);

      // Check if Google Pay is available
      if (!window.googlePayClient) {
        throw new Error('Google Pay is not available');
      }

      // Validate required merchant IDs
      const merchant = permit?.municipal_permit_merchants?.merchants;
      if (!merchant?.finix_identity_id) {
        throw new Error('Merchant identity ID not available for this permit');
      }

      if (!googlePayMerchantId) {
        throw new Error('Google Pay merchant ID not configured');
      }

      console.log('Google Pay configuration:', {
        gatewayMerchantId: merchant.finix_identity_id,
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
              gatewayMerchantId: merchant.finix_identity_id,
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
          merchantName: merchant.merchant_name || permit.municipal_permit_merchants?.permit_merchant_name || 'Municipal Services',
        },
      };

      // Load payment data from Google Pay
      const paymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
      
      console.log('Google Pay payment data received:', paymentData);

      // Extract token and billing info
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

      // Generate idempotency ID
      const idempotencyId = `googlepay_${permit.permit_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Call our edge function to process the payment
      const { data, error } = await supabase.functions.invoke('process-permit-google-pay-transfer', {
        body: {
          permit_id: permit.permit_id,
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
          description: "Your Google Pay permit payment has been processed successfully.",
        });
      } else {
        throw new Error(data?.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Google Pay payment error:', error);
      console.log('Google Pay error structure:', {
        message: error?.message,
        valueMessage: error?.value?.message,
        valueStatusCode: error?.value?.statusCode,
        valueName: error?.value?.name,
        toString: error?.toString()
      });
      
      // Extract error message from nested structure
      const errorMessage = error?.value?.message || error?.message || error?.toString() || '';
      const statusCode = error?.value?.statusCode;
      const errorName = error?.value?.name;
      
      // Check for user cancellation using multiple indicators
      const isUserCancellation = statusCode === 'CANCELED' ||
                                errorName === 'AbortError' ||
                                errorMessage.includes('CANCELED') || 
                                errorMessage.includes('canceled') || 
                                errorMessage.includes('cancelled') ||
                                errorMessage.includes('User canceled') ||
                                errorMessage.includes('User closed the Payment Request UI') ||
                                errorMessage.includes('AbortError') ||
                                errorMessage.includes('Payment request was aborted');
      
      if (!isUserCancellation) {
        toast({
          title: "Payment Failed",
          description: errorMessage || 'Google Pay payment failed. Please try again.',
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleApplePayment = async (): Promise<void> => {
    try {
      setIsProcessingPayment(true);

      // This would need to be implemented in a full Apple Pay flow
      // For now, return success for testing
      toast({
        title: "Payment Successful",
        description: "Your Apple Pay permit payment has been processed successfully.",
      });

    } catch (error) {
      console.error('Apple Pay payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Apple Pay permit payment failed. Please try again.",
        variant: "destructive",
      });
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