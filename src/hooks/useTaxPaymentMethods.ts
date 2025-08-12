import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments, UserPaymentInstrument } from './useUserPaymentInstruments';
import { ServiceFee, PaymentResponse, GooglePayMerchantResponse } from '@/types/payment';
import { classifyPaymentError, generateIdempotencyId } from '@/utils/paymentUtils';

export const useTaxPaymentMethods = (taxData: {
  municipality: any;
  taxType: string;
  amount: number; // in cents
  calculationData?: any;
  payer?: any;
  taxPeriodStart?: string;
  taxPeriodEnd?: string;
  taxYear?: number;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { paymentInstruments, isLoading: paymentMethodsLoading, loadPaymentInstruments } = useUserPaymentInstruments();
  
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

  // Calculate service fee based on payment method
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
    
    let basisPoints = 300; // 3% default for cards
    let fixedFee = 0;
    
    if (isACH) {
      basisPoints = 100; // 1% for ACH
      fixedFee = 100; // $1.00 fixed fee for ACH
    }

    const percentageFee = Math.round((taxData.amount * basisPoints) / 10000);
    const totalFee = percentageFee + fixedFee;
    
    return {
      totalFee,
      percentageFee,
      fixedFee,
      basisPoints,
      isCard: !isACH,
      totalAmountToCharge: taxData.amount + totalFee,
      serviceFeeToDisplay: totalFee
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
    const initializeFinix = async () => {
      try {
        if (typeof window !== 'undefined' && window.Finix) {
          // Simplified fraud detection for tax payments
          const sessionId = `tax-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setFraudSessionId(sessionId);
          setFinixFingerprint('tax-fingerprint');
        }
      } catch (error) {
        console.error('Error initializing Finix fraud detection:', error);
      }
    };

    if (user && taxData.municipality?.finix_merchant_id) {
      initializeFinix();
    }
  }, [user, taxData.municipality?.finix_merchant_id]);

  // Fetch Google Pay merchant ID
  useEffect(() => {
    const fetchGooglePayMerchantId = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-google-pay-merchant-id');
        const response = data as GooglePayMerchantResponse;
        if (response?.merchant_id) {
          setGooglePayMerchantId(response.merchant_id);
        }
      } catch (error) {
        console.error('Error fetching Google Pay merchant ID:', error);
      }
    };

    fetchGooglePayMerchantId();
  }, []);

  // Handle regular payment processing
  const handlePayment = async (): Promise<void> => {
    if (!selectedPaymentMethod || !user) {
      toast({
        title: "Error",
        description: "Please select a payment method and ensure you are logged in.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      const paymentData = {
        taxType: taxData.taxType,
        taxPeriodStart: taxData.taxPeriodStart,
        taxPeriodEnd: taxData.taxPeriodEnd,
        taxYear: taxData.taxYear,
        customerId: taxData.municipality?.customer_id,
        merchantId: taxData.municipality?.id,
        paymentInstrumentId: selectedPaymentMethod,
        idempotencyId: generateIdempotencyId('tax'),
        fraudSessionId,
        calculationData: taxData.calculationData,
        payer: taxData.payer
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
        return;
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
    if (!googlePayMerchantId || !taxData.municipality?.finix_merchant_id) {
      toast({
        title: "Error",
        description: "Google Pay is not available for this municipality.",
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