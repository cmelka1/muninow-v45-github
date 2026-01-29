import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PaymentResponse, PaymentError } from '@/types/payment';
import { classifyPaymentError } from '@/utils/paymentUtils';
import type { PaymentDataRequest } from '@/types/googlepay';

export type EntityType = 'permit' | 'tax_submission' | 'business_license' | 'service_application';

interface GooglePayConfig {
  entityType: EntityType;
  entityId: string;
  merchantId: string;  // Supabase merchant UUID
  baseAmountCents: number;
  serviceFeeAmountCents?: number;
  onSuccess?: (response: PaymentResponse) => void;
  onError?: (error: PaymentError) => void;
}

interface GooglePayMerchantConfig {
  finixIdentityId: string;      // For gatewayMerchantId
  googleMerchantId: string;     // For merchantInfo.merchantId
  finixMerchantId: string | null;
}

interface UseGooglePayReturn {
  isReady: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  initiatePayment: () => Promise<PaymentResponse>;
  error: string | null;
  merchantConfig: GooglePayMerchantConfig | null;
}

/**
 * Dedicated hook for Google Pay payments.
 * 
 * This hook handles:
 * 1. Loading merchant configuration from Edge function
 * 2. Checking Google Pay availability
 * 3. Constructing the paymentRequest with correct merchant IDs
 * 4. Processing the payment through the backend
 */
export function useGooglePay(config: GooglePayConfig): UseGooglePayReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantConfig, setMerchantConfig] = useState<GooglePayMerchantConfig | null>(null);
  
  // Refs to prevent double processing
  const processingRef = useRef(false);
  const configLoadedRef = useRef(false);

  // Load merchant configuration from Edge function
  useEffect(() => {
    if (!config.merchantId || configLoadedRef.current) return;
    
    const loadMerchantConfig = async () => {
      console.group('🔑 GOOGLE_PAY_CONFIG_LOAD');
      console.log('Loading merchant config for:', config.merchantId);
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          'get-google-pay-merchant-id',
          { body: { merchant_id: config.merchantId } }
        );

        console.log('Edge function response:', data);
        
        if (fnError) {
          console.error('Edge function error:', fnError);
          setError('Failed to load Google Pay configuration');
          setIsLoading(false);
          console.groupEnd();
          return;
        }

        if (!data?.success) {
          console.error('Edge function returned failure:', data);
          setError(data?.error || 'Google Pay not configured');
          setIsLoading(false);
          console.groupEnd();
          return;
        }

        // Validate we have the required configuration
        if (!data.finix_identity_id) {
          console.error('Missing finix_identity_id in response');
          setError('Google Pay not configured for this merchant');
          setIsLoading(false);
          console.groupEnd();
          return;
        }

        // In TEST mode, allow proceeding without google_merchant_id
        // In PRODUCTION, this will cause OR_BIBED_11 error
        const isProduction = import.meta.env.PROD || import.meta.env.VITE_GOOGLE_PAY_ENV === 'PRODUCTION';
        
        if (!data.google_merchant_id) {
          if (isProduction) {
            console.error('Missing google_merchant_id in response - Google Pay will fail in PRODUCTION!');
            setError('Google Pay configuration incomplete');
            setIsLoading(false);
            console.groupEnd();
            return;
          } else {
            console.warn('⚠️ Missing google_merchant_id - using TEST mode without Google merchant verification');
            console.warn('⚠️ Set GOOGLE_PAY_MERCHANT_ID_GOOGLE secret in Supabase for production');
          }
        }

        const merchantCfg: GooglePayMerchantConfig = {
          finixIdentityId: data.finix_identity_id,
          googleMerchantId: data.google_merchant_id || 'BCR2DN7TZDH05TZ4', // Fallback for TEST mode
          finixMerchantId: data.finix_merchant_id || null
        };

        console.log('✅ Merchant configuration loaded:', {
          finixIdentityId: merchantCfg.finixIdentityId,
          googleMerchantId: merchantCfg.googleMerchantId,
          hasFinixMerchantId: !!merchantCfg.finixMerchantId,
          isProduction
        });

        setMerchantConfig(merchantCfg);
        configLoadedRef.current = true;

        // Check if Google Pay API is available
        if (window.google?.payments?.api) {
          const isProduction = import.meta.env.PROD || import.meta.env.VITE_GOOGLE_PAY_ENV === 'PRODUCTION';
          const paymentsClient = new window.google.payments.api.PaymentsClient({
            environment: isProduction ? 'PRODUCTION' : 'TEST'
          });

          const isReadyToPayRequest = {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: [{
              type: 'CARD' as const,
              parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
              }
            }]
          };

          const readyResponse = await paymentsClient.isReadyToPay(isReadyToPayRequest);
          setIsReady(readyResponse.result);
          console.log('Google Pay ready:', readyResponse.result);
        } else {
          console.warn('Google Pay API not loaded');
          setIsReady(false);
        }

        setIsLoading(false);
        
      } catch (err) {
        console.error('Error loading merchant config:', err);
        setError('Failed to initialize Google Pay');
        setIsLoading(false);
      }
      
      console.groupEnd();
    };

    loadMerchantConfig();
  }, [config.merchantId]);

  // Initiate Google Pay payment
  const initiatePayment = useCallback(async (): Promise<PaymentResponse> => {
    console.group('💰 GOOGLE_PAY_PAYMENT_START');
    
    // Prevent double processing
    if (processingRef.current || isProcessing) {
      console.log('⚠️ Payment already in progress');
      console.groupEnd();
      throw new Error('Payment already in progress');
    }

    if (!merchantConfig) {
      console.error('❌ Merchant configuration not loaded');
      console.groupEnd();
      throw new Error('Google Pay not configured');
    }

    if (!isReady) {
      console.error('❌ Google Pay not ready');
      console.groupEnd();
      throw new Error('Google Pay is not available');
    }

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      // Initialize Google Pay client
      const isProduction = import.meta.env.PROD || import.meta.env.VITE_GOOGLE_PAY_ENV === 'PRODUCTION';
      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: isProduction ? 'PRODUCTION' : 'TEST'
      });

      // Calculate total amount
      const totalCents = config.baseAmountCents + (config.serviceFeeAmountCents || 0);
      const totalPriceDollars = (totalCents / 100).toFixed(2);

      // Construct payment request with CORRECT merchant IDs
      const paymentRequest: PaymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD' as const,
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'] as const,
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'] as const
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY' as const,
            parameters: {
              gateway: 'finix',
              // This is the Finix identity ID for tokenization
              gatewayMerchantId: merchantConfig.finixIdentityId
            }
          }
        }],
        merchantInfo: {
          // This is Google's BCR2DN... ID for merchant verification
          merchantId: merchantConfig.googleMerchantId,
          merchantName: 'Muni Now'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL' as const,
          totalPrice: totalPriceDollars,
          currencyCode: 'USD',
          countryCode: 'US'
        }
      };

      console.log('📤 Payment request constructed:');
      console.log('   gatewayMerchantId:', merchantConfig.finixIdentityId);
      console.log('   merchantInfo.merchantId:', merchantConfig.googleMerchantId);
      console.log('   totalPrice:', totalPriceDollars);

      // Load Google Pay payment data
      console.log('🔄 Calling Google Pay loadPaymentData...');
      const paymentData = await paymentsClient.loadPaymentData(paymentRequest);
      console.log('✅ Google Pay data loaded successfully');

      // Extract the payment token
      const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
      
      // DEBUG: Log token details to understand format
      console.log('🔑 Google Pay Token Debug:');
      console.log('   typeof token:', typeof paymentToken);
      console.log('   token length:', paymentToken?.length);
      console.log('   first 100 chars:', paymentToken?.substring(0, 100));
      console.log('   is valid JSON?:', (() => { try { JSON.parse(paymentToken); return true; } catch { return false; } })());

      // Send to backend Edge function
      console.log('📤 Sending payment to backend...');
      const { data, error: fnError } = await supabase.functions.invoke(
        'process-unified-google-pay',
        {
          body: {
            entity_type: config.entityType,
            entity_id: config.entityId,
            merchant_id: config.merchantId,
            base_amount_cents: config.baseAmountCents,
            google_pay_token: paymentToken,
            first_name: user?.user_metadata?.first_name,
            last_name: user?.user_metadata?.last_name,
            user_email: user?.email
          }
        }
      );

      if (fnError) {
        console.error('❌ Backend error:', fnError);
        const classifiedError = classifyPaymentError(fnError);
        config.onError?.(classifiedError);
        throw new Error(classifiedError.message);
      }

      if (!data?.success) {
        console.error('❌ Payment failed:', data);
        const classifiedError = classifyPaymentError(data?.error || 'Payment failed');
        config.onError?.(classifiedError);
        throw new Error(data?.error || 'Payment failed');
      }

      console.log('✅ Payment successful!', data);
      
      const response: PaymentResponse = {
        success: true,
        payment_id: data.payment_id || data.id,
        transaction_id: data.transaction_id,
        status: 'completed'
      };

      config.onSuccess?.(response);
      
      toast({
        title: 'Payment Successful',
        description: 'Your Google Pay payment has been processed successfully.',
      });

      console.groupEnd();
      return response;

    } catch (err) {
      console.error('❌ Google Pay error:', err);
      
      let errorMessage = 'Google Pay payment failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Check for user cancellation
      if (errorMessage.includes('closed') || errorMessage.includes('cancel')) {
        console.log('User cancelled Google Pay');
      } else {
        setError(errorMessage);
        toast({
          title: 'Payment Failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }

      const paymentError: PaymentError = {
        type: 'unknown',
        message: errorMessage,
        retryable: true
      };
      
      config.onError?.(paymentError);
      console.groupEnd();
      throw err;
      
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [merchantConfig, isReady, isProcessing, config, user, toast]);

  return {
    isReady,
    isLoading,
    isProcessing,
    initiatePayment,
    error,
    merchantConfig
  };
}
