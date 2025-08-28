import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments, UserPaymentInstrument } from './useUserPaymentInstruments';
import { ServiceFee, PaymentResponse, GooglePayMerchantResponse } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId } from '@/utils/paymentUtils';
import { useSessionValidation } from '@/hooks/useSessionValidation';

export const useTaxPaymentMethods = (taxData: {
  municipality: any;
  taxType: string;
  amount: number; // in cents
  calculationData?: any;
  payer?: any;
  taxPeriodStart?: string;
  taxPeriodEnd?: string;
  taxYear?: number;
  stagingId?: string;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { paymentInstruments, isLoading: paymentMethodsLoading, loadPaymentInstruments } = useUserPaymentInstruments();
  const { ensureValidSession } = useSessionValidation();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [finixFingerprint, setFinixFingerprint] = useState<string>('');
  const [fraudSessionId, setFraudSessionId] = useState<string>('');
  const [googlePayMerchantId, setGooglePayMerchantId] = useState<string | null>(null);

  // Get top 3 payment methods, with default first
  const topPaymentMethods = paymentInstruments
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 3);

  // Calculate service fee based on payment method using grossed-up formula
  const calculateServiceFee = useCallback((): ServiceFee => {
    if (!selectedPaymentMethod || !taxData.amount) {
      return {
        totalFee: 0,
        percentageFee: 0,
        fixedFee: 0,
        basisPoints: 0,
        isCard: true,
        totalAmountToCharge: taxData.amount,
        serviceFeeToDisplay: 0
      };
    }

    // Find the selected payment method
    const paymentMethod = paymentInstruments.find(p => p.id === selectedPaymentMethod);
    const isACH = paymentMethod?.instrument_type === 'BANK_ACCOUNT';
    
    let basisPoints = 300; // 3% for cards
    let fixedFee = 50; // $0.50 fixed fee for cards
    
    if (isACH) {
      basisPoints = 150; // 1.5% for ACH
      fixedFee = 50; // $0.50 fixed fee for ACH
    }

    // Convert basis points to decimal percentage (p)
    const percentageDecimal = basisPoints / 10000;
    
    // Prevent division by zero or invalid percentages
    if (percentageDecimal >= 1) {
      console.error('Invalid percentage fee for tax: cannot be 100% or higher');
      return {
        totalFee: 0,
        percentageFee: 0,
        fixedFee,
        basisPoints,
        isCard: !isACH,
        totalAmountToCharge: taxData.amount,
        serviceFeeToDisplay: 0
      };
    }
    
    // Apply grossed-up formula: T = (A + f) / (1 - p)
    const totalAmountToCharge = Math.round((taxData.amount + fixedFee) / (1 - percentageDecimal));
    const serviceFeeToDisplay = totalAmountToCharge - taxData.amount;
    
    // Calculate percentage fee for display purposes
    const percentageFee = Math.round((taxData.amount * basisPoints) / 10000);
    
    return {
      totalFee: serviceFeeToDisplay, // Legacy compatibility
      percentageFee,
      fixedFee,
      basisPoints,
      isCard: !isACH,
      totalAmountToCharge,
      serviceFeeToDisplay
    };
  }, [selectedPaymentMethod, taxData.amount, paymentInstruments]);

  const serviceFee = calculateServiceFee();
  const totalWithFee = serviceFee.totalAmountToCharge;

  // Auto-select default payment method
  useEffect(() => {
    if (paymentInstruments.length > 0 && !selectedPaymentMethod) {
      const defaultMethod = paymentInstruments.find(p => p.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      } else {
        setSelectedPaymentMethod(paymentInstruments[0].id);
      }
    }
  }, [paymentInstruments, selectedPaymentMethod]);

  // Initialize Finix fraud detection
  useEffect(() => {
    const initializeFinixAuth = () => {
      // Check if Finix library is loaded and municipality has merchant data
      if (typeof window !== 'undefined' && window.Finix && taxData.municipality?.finix_merchant_id) {
        try {
          const finixMerchantId = taxData.municipality.finix_merchant_id;
          console.log('Initializing Finix Auth for tax payments with merchant ID:', finixMerchantId);
          
          // Use proper Finix Auth initialization (same pattern as permits)
          const auth = window.Finix.Auth(
            "sandbox", // Environment
            finixMerchantId, // Merchant ID from municipality data
            (sessionKey: string) => {
              console.log('Finix Auth initialized with session key for tax payments:', sessionKey);
              setFraudSessionId(sessionKey);
            }
          );
          
          // Also try to get session key immediately if available
          try {
            const immediateSessionKey = auth.getSessionKey();
            if (immediateSessionKey) {
              setFraudSessionId(immediateSessionKey);
              console.log('Got immediate session key for tax payments');
            }
          } catch (error) {
            console.log('Session key not immediately available for tax payments, will wait for callback');
          }
        } catch (error) {
          console.error('Error initializing Finix Auth for tax payments:', error);
          // Fallback session ID generation on error
          const fallbackSessionId = `tax-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setFraudSessionId(fallbackSessionId);
          setFinixFingerprint('tax-fingerprint-error');
        }
      } else {
        console.warn('Finix library not loaded or no merchant ID, using fallback session ID for tax payments');
        // Fallback for when Finix library is not available
        const fallbackSessionId = `tax-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setFraudSessionId(fallbackSessionId);
        setFinixFingerprint('tax-fingerprint-fallback');
      }
    };

    if (user && taxData.municipality?.finix_merchant_id) {
      initializeFinixAuth();
    }
  }, [user, taxData.municipality?.finix_merchant_id]);

  // Fetch Google Pay merchant ID automatically on mount
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
          console.log('Google Pay merchant ID fetched for tax payments:', response.merchant_id);
        } else {
          console.warn('Google Pay merchant ID not configured for tax payments');
        }
      } catch (error) {
        console.error('Failed to fetch Google Pay merchant ID for tax payments:', error);
      }
    };

    fetchGooglePayMerchantId();
  }, []);

  // Handle regular payment processing
  const handlePayment = async (): Promise<{ taxSubmissionId?: string } | void> => {
    if (!selectedPaymentMethod || !user) {
      toast({
        title: "Error",
        description: "Please select a payment method and ensure you are logged in.",
        variant: "destructive",
      });
      return;
    }

    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    
    if (!sessionValid) {
      return;
    }

    // Validate municipality has Finix merchant ID
    if (!taxData.municipality?.finix_merchant_id) {
      toast({
        title: "Configuration Error",
        description: "This municipality is not configured for online payments. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    // Validate amount is reasonable
    if (!totalWithFee || totalWithFee <= 0) {
      toast({
        title: "Invalid Amount",
        description: "The payment amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      // Always use totalWithFee as the primary amount (includes service fees)
      // This is the grossed-up amount that includes the service fee
      const finalAmountCents = totalWithFee;

      // Generate idempotency ID with validation
      let idempotencyId: string;
      try {
        idempotencyId = generateIdempotencyId('tax');
        if (!idempotencyId || idempotencyId.trim() === '') {
          throw new Error('Failed to generate idempotency ID');
        }
      } catch (error) {
        console.error('Idempotency ID generation failed:', error);
        toast({
          title: "System Error",
          description: "Failed to generate payment identifier. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Validate fraud session ID
      let validFraudSessionId = fraudSessionId;
      if (!validFraudSessionId || validFraudSessionId.trim() === '') {
        console.warn('No fraud session ID available, generating fallback');
        validFraudSessionId = `tax-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      console.log('Payment data preparation:', {
        finalAmountCents,
        idempotencyId,
        fraudSessionId: validFraudSessionId,
        serviceFee: serviceFee.totalFee
      });

      const paymentData = {
        tax_type: taxData.taxType,
        tax_period_start: taxData.taxPeriodStart,
        tax_period_end: taxData.taxPeriodEnd,
        tax_year: taxData.taxYear,
        customer_id: taxData.municipality?.customer_id,
        merchant_id: taxData.municipality?.finix_merchant_id,
        payment_instrument_id: selectedPaymentMethod,
        base_amount_cents: taxData.amount, // Original tax amount (base)
        service_fee_cents: serviceFee.serviceFeeToDisplay, // Calculated service fee
        total_amount_cents: finalAmountCents, // Grossed-up total
        idempotency_id: idempotencyId,
        fraud_session_id: validFraudSessionId,
        calculation_notes: taxData.calculationData?.calculationNotes || '',
        staging_id: taxData.stagingId, // Pass staging ID for document confirmation
        // Flatten payer object into individual fields - fix field mapping
        payer_first_name: taxData.payer?.firstName || '',
        payer_last_name: taxData.payer?.lastName || '',
        payer_email: taxData.payer?.email || '',
        payer_ein: taxData.payer?.ein || '',
        payer_phone: taxData.payer?.phone || '',
        payer_business_name: taxData.payer?.businessName || '',
        payer_street_address: taxData.payer?.address?.street || '',
        payer_city: taxData.payer?.address?.city || '',
        payer_state: taxData.payer?.address?.state || '',
        payer_zip_code: taxData.payer?.address?.zipCode || ''
      };

      const { data, error } = await supabase.functions.invoke('process-tax-payment', {
        body: paymentData
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Successful",
          description: "Your tax payment has been processed successfully.",
        });
        return { taxSubmissionId: data.tax_submission_id };
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Google Pay payment
  const handleGooglePayment = async (): Promise<void> => {
    if (!taxData.municipality?.finix_merchant_id) {
      toast({
        title: "Error",
        description: "Google Pay is not available for this municipality.",
        variant: "destructive",
      });
      return;
    }

    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    
    if (!sessionValid) {
      return;
    }

    if (!googlePayMerchantId) {
      toast({
        title: "Error",
        description: "Google Pay is not configured for this municipality.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: 'TEST'
      });

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
              gatewayMerchantId: taxData.municipality.finix_merchant_id
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
          merchantName: taxData.municipality.merchant_name || 'Municipality Tax Payment'
        }
      };

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

      const { data, error } = await supabase.functions.invoke('process-google-pay-transfer', {
        body: {
          paymentData,
          taxType: taxData.taxType,
          municipality: taxData.municipality,
          amount: taxData.amount,
          serviceFee: serviceFee.totalFee,
          totalAmount: totalWithFee,
          fraudSessionId,
          finixFingerprint,
          idempotencyId: `tax-gpay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Successful",
          description: "Your Google Pay tax payment has been processed successfully.",
        });
      } else {
        throw new Error(data.error || 'Google Pay payment failed');
      }
    } catch (error: any) {
      console.error('Google Pay payment error:', error);
      if (!error.message?.includes('cancelled')) {
        toast({
          title: "Payment Failed",
          description: error.message || "There was an error processing your Google Pay payment.",
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Apple Pay payment
  const handleApplePayment = async (): Promise<void> => {
    if (!window.ApplePaySession?.canMakePayments()) {
      toast({
        title: "Error",
        description: "Apple Pay is not available on this device.",
        variant: "destructive",
      });
      return;
    }

    // Validate session before processing payment
    const sessionValid = await ensureValidSession();
    
    if (!sessionValid) {
      return;
    }

    setIsProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-apple-pay-transfer', {
        body: {
          taxType: taxData.taxType,
          municipality: taxData.municipality,
          amount: taxData.amount,
          serviceFee: serviceFee.totalFee,
          totalAmount: totalWithFee,
          fraudSessionId,
          finixFingerprint,
          idempotencyId: `tax-apay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Payment Successful",
          description: "Your Apple Pay tax payment has been processed successfully.",
        });
      } else {
        throw new Error(data.error || 'Apple Pay payment failed');
      }
    } catch (error: any) {
      console.error('Apple Pay payment error:', error);
      if (!error.message?.includes('cancelled')) {
        toast({
          title: "Payment Failed",
          description: error.message || "There was an error processing your Apple Pay payment.",
          variant: "destructive",
        });
      }
      throw error;
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