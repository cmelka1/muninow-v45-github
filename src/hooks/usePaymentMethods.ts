import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { supabase } from '@/integrations/supabase/client';

interface BillData {
  bill_id: string;
  total_amount_cents: number;
  merchant_finix_identity_id?: string;
  finix_merchant_id?: string;
  merchant_name?: string;
  business_legal_name?: string;
  basis_points?: number;
  fixed_fee?: number;
  ach_basis_points?: number;
  ach_fixed_fee?: number;
}

interface ServiceFee {
  totalFee: number;
  percentageFee: number;
  fixedFee: number;
  basisPoints: number;
  isCard: boolean;
}

export const usePaymentMethods = (bill: BillData | null) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { paymentInstruments, isLoading: paymentMethodsLoading, loadPaymentInstruments } = useUserPaymentInstruments();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [finixAuth, setFinixAuth] = useState<any>(null);
  const [fraudSessionId, setFraudSessionId] = useState<string | null>(null);
  const [googlePayMerchantId, setGooglePayMerchantId] = useState<string | null>(null);

  // Get top payment methods (prioritize default, then by creation date)
  const topPaymentMethods = paymentInstruments
    .slice()
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Calculate service fee
  const calculateServiceFee = (): ServiceFee | null => {
    if (!bill) return null;
    
    // Handle Google Pay and Apple Pay as special cases - always use card fees
    if (selectedPaymentMethod === 'google-pay' || selectedPaymentMethod === 'apple-pay') {
      const basisPoints = bill.basis_points || 250;
      const fixedFee = bill.fixed_fee || 50;
      const percentageFee = Math.round((bill.total_amount_cents * basisPoints) / 10000);
      const totalFee = percentageFee + fixedFee;

      return {
        totalFee,
        percentageFee,
        fixedFee,
        basisPoints,
        isCard: true
      };
    }
    
    if (!selectedPaymentMethod) return null;
    
    const selectedInstrument = topPaymentMethods.find(instrument => instrument.id === selectedPaymentMethod);
    if (!selectedInstrument) return null;

    const isCard = selectedInstrument.instrument_type === 'PAYMENT_CARD';
    const basisPoints = isCard ? (bill.basis_points || 250) : (bill.ach_basis_points || 20);
    const fixedFee = isCard ? (bill.fixed_fee || 50) : (bill.ach_fixed_fee || 50);

    const percentageFee = Math.round((bill.total_amount_cents * basisPoints) / 10000);
    const totalFee = percentageFee + fixedFee;

    return {
      totalFee,
      percentageFee,
      fixedFee,
      basisPoints,
      isCard
    };
  };

  const serviceFee = calculateServiceFee();
  const totalWithFee = bill ? bill.total_amount_cents + (serviceFee?.totalFee || 0) : 0;
  const isPaymentAvailable = bill?.finix_merchant_id;

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
      if (typeof window !== 'undefined' && window.Finix && bill?.finix_merchant_id) {
        try {
          console.log('Initializing Finix Auth with merchant ID:', bill.finix_merchant_id);
          
          const auth = window.Finix.Auth(
            "sandbox",
            bill.finix_merchant_id,
            (sessionKey: string) => {
              console.log('Finix Auth initialized with session key:', sessionKey);
              setFraudSessionId(sessionKey);
            }
          );
          
          setFinixAuth(auth);
          
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

    initializeFinixAuth();

    if (!window.Finix) {
      const retryTimeout = setTimeout(initializeFinixAuth, 1000);
      return () => clearTimeout(retryTimeout);
    }
  }, [bill?.finix_merchant_id]);

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

  // Payment handlers
  const handleRegularPayment = async () => {
    if (!selectedPaymentMethod || !bill) {
      toast({
        title: "Error",
        description: "Please select a payment method and ensure bill details are loaded.",
        variant: "destructive",
      });
      return;
    }

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

      const idempotencyId = `${bill.bill_id}-${selectedPaymentMethod}-${Date.now()}`;

      let currentFraudSessionId = fraudSessionId;
      if (finixAuth && !currentFraudSessionId) {
        try {
          currentFraudSessionId = finixAuth.getSessionKey();
          setFraudSessionId(currentFraudSessionId);
        } catch (error) {
          console.warn('Could not get fraud session ID:', error);
        }
      }

      const { data, error } = await supabase.functions.invoke('process-finix-transfer', {
        body: {
          bill_id: bill.bill_id,
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
          description: "Your payment has been processed successfully.",
        });
        
        navigate(data.redirect_url);
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

  const handleGooglePayment = async () => {
    try {
      setIsProcessingPayment(true);

      if (!window.googlePayClient) {
        throw new Error('Google Pay is not available');
      }

      if (!bill.merchant_finix_identity_id) {
        throw new Error('Merchant identity ID not available for this bill');
      }

      if (!googlePayMerchantId) {
        throw new Error('Google Pay merchant ID not configured');
      }

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
              gatewayMerchantId: bill.merchant_finix_identity_id,
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
          merchantName: bill.merchant_name || bill.business_legal_name || 'Merchant',
        },
      };

      const paymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
      
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

      const idempotencyId = `googlepay_${bill.bill_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase.functions.invoke('process-google-pay-transfer', {
        body: {
          bill_id: bill.bill_id,
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
          description: "Your Google Pay payment has been processed successfully.",
        });
        if (data.redirect_url) {
          navigate(data.redirect_url);
        }
      } else {
        throw new Error(data?.error || 'Payment failed');
      }

    } catch (error) {
      console.error('Google Pay payment error:', error);
      
      const errorMessage = error?.value?.message || error?.message || error?.toString() || '';
      const statusCode = error?.value?.statusCode;
      const errorName = error?.value?.name;
      
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

  const handleApplePayment = async () => {
    try {
      setIsProcessingPayment(true);

      if (!window.ApplePaySession) {
        throw new Error('Apple Pay is not available');
      }

      const paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: bill.merchant_name || bill.business_legal_name || 'Payment',
          amount: (totalWithFee / 100).toFixed(2)
        }
      };

      const session = new window.ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event) => {
        try {
          const { data, error } = await supabase.functions.invoke('validate-apple-pay-merchant', {
            body: {
              validationURL: event.validationURL,
              domainName: window.location.hostname
            }
          });

          if (error) throw error;
          
          session.completeMerchantValidation(data.merchantSession);
        } catch (error) {
          console.error('Merchant validation failed:', error);
          session.abort();
        }
      };

      session.onpaymentauthorized = async (event) => {
        try {
          const paymentToken = JSON.stringify(event.payment.token);
          const billingContact = event.payment.billingContact;

          const idempotencyId = `applepay_${bill.bill_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const { data, error } = await supabase.functions.invoke('process-apple-pay-transfer', {
            body: {
              bill_id: bill.bill_id,
              apple_pay_token: paymentToken,
              total_amount_cents: totalWithFee,
              idempotency_id: idempotencyId,
              billing_contact: billingContact ? {
                given_name: billingContact.givenName,
                family_name: billingContact.familyName,
                postal_code: billingContact.postalCode
              } : undefined
            }
          });

          if (error) throw error;

          if (data?.success) {
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            toast({
              title: "Payment Successful",
              description: "Your Apple Pay payment has been processed successfully.",
            });
            if (data.redirect_url) {
              navigate(data.redirect_url);
            }
          } else {
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
            throw new Error(data?.error || 'Payment failed');
          }
        } catch (error) {
          console.error('Apple Pay authorization failed:', error);
          session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          toast({
            title: "Payment Failed",
            description: "Apple Pay payment failed. Please try again.",
            variant: "destructive",
          });
        }
      };

      session.oncancel = () => {
        console.log('Apple Pay session was cancelled by user');
      };

      session.begin();

    } catch (error) {
      console.error('Apple Pay session error:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to start Apple Pay session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return {
    paymentInstruments: topPaymentMethods,
    paymentMethodsLoading,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    isPaymentAvailable,
    googlePayMerchantId,
    fraudSessionId,
    bill,
    handleRegularPayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments
  };
};