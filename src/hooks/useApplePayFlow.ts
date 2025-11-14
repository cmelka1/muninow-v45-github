import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PaymentResponse } from '@/types/payment';
import type { EntityType } from './useUnifiedPaymentFlow';

interface ApplePayFlowParams {
  entityType: EntityType;
  entityId: string;
  merchantId: string;
  totalAmountCents: number;
  finixSessionKey?: string;
  onSuccess?: (response: PaymentResponse) => void;
  onError?: (error: any) => void;
}

export const useApplePayFlow = (params: ApplePayFlowParams) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);

  // Check Apple Pay availability
  useEffect(() => {
    const checkAvailability = async () => {
      console.log('🍎 [useApplePayFlow] Checking Apple Pay availability...');
      
      // Must be authenticated
      if (!user) {
        console.log('🍎 [useApplePayFlow] ❌ User not authenticated');
        setIsAvailable(false);
        setIsCheckingAvailability(false);
        return;
      }

      // Check browser support
      if (typeof window === 'undefined' || !window.ApplePaySession) {
        console.log('🍎 [useApplePayFlow] ❌ Apple Pay not supported in this browser');
        setIsAvailable(false);
        setIsCheckingAvailability(false);
        return;
      }

      // Check device capability
      const canMakePayments = window.ApplePaySession.canMakePayments();
      console.log('🍎 [useApplePayFlow] Can make payments:', canMakePayments);
      
      setIsAvailable(canMakePayments);
      setIsCheckingAvailability(false);
    };

    checkAvailability();
  }, [user]);

  const handleApplePayPayment = useCallback((): Promise<PaymentResponse> => {
    console.log('%c🍎 APPLE PAY DEBUG MODE ENABLED', 'background: #000; color: #fff; font-size: 16px; padding: 10px;');
    console.log('%cIf payment fails, please copy ALL console logs and share them.', 'color: #ff0000; font-size: 12px;');
    console.log('🍎 [useApplePayFlow] ========================================');
    console.log('🍎 [useApplePayFlow] STARTING APPLE PAY PAYMENT');
    console.log('🍎 [useApplePayFlow] ========================================');
    console.log('🍎 [useApplePayFlow] User:', user?.id);
    console.log('🍎 [useApplePayFlow] Entity:', params.entityType, params.entityId);
    console.log('🍎 [useApplePayFlow] Amount:', params.totalAmountCents);

    // Basic pre-checks (synchronous only)
    if (!user) {
      const error = 'Please log in to use Apple Pay';
      console.error('🍎 [useApplePayFlow] ❌ Not authenticated');
      toast({
        title: "Authentication Required",
        description: error,
        variant: "destructive",
      });
      throw new Error(error);
    }

    if (!window.ApplePaySession || !window.ApplePaySession.canMakePayments()) {
      const error = 'Apple Pay is not available on this device';
      console.error('🍎 [useApplePayFlow] ❌ Apple Pay not available');
      toast({
        title: "Apple Pay Not Available",
        description: error,
        variant: "destructive",
      });
      throw new Error(error);
    }

    return new Promise<PaymentResponse>((resolve, reject) => {
      try {
        setIsProcessing(true);

        const totalPriceDollars = (params.totalAmountCents / 100).toFixed(2);
        console.log('🍎 [useApplePayFlow] Creating payment request:', {
          totalCents: params.totalAmountCents,
          totalDollars: totalPriceDollars
        });

        // Create Apple Pay payment request
        const paymentRequest = {
          countryCode: "US",
          currencyCode: "USD",
          merchantCapabilities: ["supports3DS"],
          supportedNetworks: ["visa", "masterCard", "amex", "discover"],
          total: {
            label: "Muni Now Payment",
            amount: totalPriceDollars
          },
          requiredBillingContactFields: ["postalAddress", "email", "name", "phone"]
        };

        console.log('🍎 [useApplePayFlow] Initializing Apple Pay session (version 6)');
        const session = new window.ApplePaySession(6, paymentRequest);

        // Session timeout (5 minutes)
        const timeoutId = setTimeout(() => {
          console.error('🍎 [useApplePayFlow] ❌ Session timeout');
          session.abort();
          setIsProcessing(false);
          reject(new Error('Payment session timed out'));
        }, 300000);

        // Store validated auth token for use in payment authorization
        let validatedAuthToken: string | null = null;

        // Handle merchant validation
        session.onvalidatemerchant = async (event: any) => {
          console.log('🍎 [useApplePayFlow] ========================================');
          console.log('🍎 [useApplePayFlow] MERCHANT VALIDATION');
          console.log('🍎 [useApplePayFlow] ========================================');
          console.log('🍎 [useApplePayFlow] Validation URL:', event.validationURL);

          try {
            // SESSION VALIDATION (moved here from pre-flight)
            console.log('🍎 [useApplePayFlow] Validating session...');
            
            // Get current session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            let validSession = sessionData.session;

            // If no session, try to refresh
            if (!validSession || sessionError) {
              console.log('🍎 [useApplePayFlow] No valid session, attempting refresh...');
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !refreshData.session) {
                throw new Error('Your session has expired. Please refresh the page and try again.');
              }
              
              validSession = refreshData.session;
              console.log('🍎 [useApplePayFlow] ✅ Session refreshed successfully');
            }

            // Check session expiry (5 minute buffer)
            const expiresAt = validSession.expires_at || 0;
            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = expiresAt - currentTime;

            if (timeUntilExpiry < 300) { // Less than 5 minutes
              console.log('🍎 [useApplePayFlow] Session expiring soon, refreshing...');
              const { data: refreshData } = await supabase.auth.refreshSession();
              if (refreshData.session) {
                validSession = refreshData.session;
                console.log('🍎 [useApplePayFlow] ✅ Session proactively refreshed');
              }
            }

            // Store validated token for later use
            validatedAuthToken = validSession.access_token;
            console.log('🍎 [useApplePayFlow] ✅ Session validation complete');

            // MERCHANT VALIDATION
            const domainName = window.location.hostname;
            console.log('🍎 [useApplePayFlow] Using domain:', domainName);
            console.log('🍎 [useApplePayFlow] Merchant ID:', params.merchantId);

            const { data, error } = await supabase.functions.invoke('create-apple-pay-session', {
              body: {
                validation_url: event.validationURL,
                merchant_id: params.merchantId,
                domain_name: domainName,
                display_name: "Muni Now"
              }
            });

            if (error || !data?.session_details) {
              console.error('🍎 [useApplePayFlow] ❌ Validation failed:', error || data);
              throw new Error(data?.error || 'Merchant validation failed');
            }

            const merchantSession = typeof data.session_details === 'string'
              ? JSON.parse(data.session_details)
              : data.session_details;

            console.log('🍎 [useApplePayFlow] ✅ Merchant validated');
            session.completeMerchantValidation(merchantSession);

          } catch (err) {
            console.error('🍎 [useApplePayFlow] ❌ Validation error:', err);
            session.abort();
            clearTimeout(timeoutId);
            setIsProcessing(false);
            toast({
              title: "Validation Error",
              description: err instanceof Error ? err.message : "Unable to validate merchant. Please try again.",
              variant: "destructive",
            });
            reject(err);
          }
        };

        // Handle payment authorization
        session.onpaymentauthorized = async (event: any) => {
          console.log('🍎 [useApplePayFlow] ========================================');
          console.log('🍎 [useApplePayFlow] PAYMENT AUTHORIZED');
          console.log('🍎 [useApplePayFlow] ========================================');
          console.log('🍎 [useApplePayFlow] Event object keys:', Object.keys(event));
          console.log('🍎 [useApplePayFlow] Payment object keys:', Object.keys(event.payment || {}));
          console.log('🍎 [useApplePayFlow] Token present:', !!event.payment?.token);
          console.log('🍎 [useApplePayFlow] Billing contact present:', !!event.payment?.billingContact);
          console.log('🍎 [useApplePayFlow] Token received');

          try {
            // Use pre-validated token
            let authToken = validatedAuthToken;

            // If payment took too long, refresh token with retry logic
            if (!authToken) {
              console.log('🍎 [useApplePayFlow] Token missing, attempting refresh...');
              const { data: refreshData } = await supabase.auth.refreshSession();
              authToken = refreshData.session?.access_token;
            }

            if (!authToken) {
              throw new Error('Authentication expired. Please refresh the page and try again.');
            }

            console.log('🍎 [useApplePayFlow] Calling process-apple-pay-payment...');

            let paymentResult;
            let lastError;

            // First attempt
            try {
              const { data, error } = await supabase.functions.invoke('process-apple-pay-payment', {
                body: {
                  entity_type: params.entityType,
                  entity_id: params.entityId,
                  merchant_id: params.merchantId,
                  base_amount_cents: params.totalAmountCents,
                  apple_pay_token: JSON.stringify(event.payment.token),
                  fraud_session_id: params.finixSessionKey || `applepay_${Date.now()}`
                },
                headers: {
                  Authorization: `Bearer ${authToken}`
                }
              });

              if (error && error.message?.includes('401')) {
                // Auth failed, try refreshing token and retry ONCE
                console.log('🍎 [useApplePayFlow] 401 error, refreshing token and retrying...');
                const { data: refreshData } = await supabase.auth.refreshSession();
                
                if (refreshData.session?.access_token) {
                  authToken = refreshData.session.access_token;
                  
                  // RETRY with new token
                  const retryResult = await supabase.functions.invoke('process-apple-pay-payment', {
                    body: {
                      entity_type: params.entityType,
                      entity_id: params.entityId,
                      merchant_id: params.merchantId,
                      base_amount_cents: params.totalAmountCents,
                      apple_pay_token: JSON.stringify(event.payment.token),
                      fraud_session_id: params.finixSessionKey || `applepay_${Date.now()}_retry`
                    },
                    headers: {
                      Authorization: `Bearer ${authToken}`
                    }
                  });
                  
                  paymentResult = retryResult;
                  console.log('🍎 [useApplePayFlow] Retry attempt result:', retryResult);
                } else {
                  throw new Error('Unable to refresh authentication. Please try again.');
                }
              } else {
                paymentResult = { data, error };
              }
            } catch (err) {
              lastError = err;
            }

            const { data, error } = paymentResult || { data: null, error: lastError };

            console.log('🍎 [useApplePayFlow] Backend response:', { data, error });

            if (error || !data?.success) {
              console.error('🍎 [useApplePayFlow] ❌ Payment failed:', error || data);
              session.completePayment(window.ApplePaySession.STATUS_FAILURE);
              throw new Error(data?.error || 'Payment processing failed');
            }

            console.log('🍎 [useApplePayFlow] ✅ Payment successful');
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            clearTimeout(timeoutId);
            setIsProcessing(false);

            const response: PaymentResponse = {
              success: true,
              transaction_id: data.finix_transfer_id,
              payment_id: data.transaction_id,
              status: 'paid'
            };

            toast({
              title: "Apple Pay Successful",
              description: `Your payment of $${totalPriceDollars} has been processed successfully.`,
            });

            params.onSuccess?.(response);
            resolve(response);

          } catch (err) {
            console.error('🍎 [useApplePayFlow] ❌ Payment error:', err);
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
            clearTimeout(timeoutId);
            setIsProcessing(false);
            
            // Classify error for better user messaging
            let errorMessage = 'Payment failed';
            let retryable = false;
            
            if (err instanceof Error) {
              if (err.message.includes('expired') || err.message.includes('Authentication')) {
                errorMessage = 'Your session expired. Please refresh the page and try again.';
                retryable = true;
              } else if (err.message.includes('network') || err.message.includes('timeout')) {
                errorMessage = 'Network error. Please check your connection and try again.';
                retryable = true;
              } else if (err.message.includes('declined') || err.message.includes('insufficient')) {
                errorMessage = 'Payment was declined. Please check your payment method.';
                retryable = true;
              } else {
                errorMessage = err.message;
              }
            }
            
            toast({
              title: "Apple Pay Failed",
              description: errorMessage,
              variant: "destructive",
            });

            params.onError?.({ 
              type: retryable ? 'retryable' : 'fatal',
              message: errorMessage,
              originalError: err 
            });
            
            reject(err);
          }
        };

        // Handle cancellation
        session.oncancel = () => {
          console.log('🍎 [useApplePayFlow] ========================================');
          console.log('🍎 [useApplePayFlow] ❌ PAYMENT CANCELLED BY USER');
          console.log('🍎 [useApplePayFlow] ========================================');
          clearTimeout(timeoutId);
          setIsProcessing(false);
          
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the Apple Pay payment.",
            variant: "destructive",
          });
          
          params.onError?.({
            type: 'user_cancelled',
            message: 'Payment cancelled by user',
            originalError: new Error('Payment cancelled')
          });
          
          reject(new Error('Payment cancelled'));
        };

        // Handle Apple Pay errors
        session.onerror = (event: any) => {
          console.log('🍎 [useApplePayFlow] ========================================');
          console.error('🍎 [useApplePayFlow] ❌ APPLE PAY ERROR EVENT');
          console.log('🍎 [useApplePayFlow] ========================================');
          console.error('🍎 [useApplePayFlow] Error event:', event);
          console.error('🍎 [useApplePayFlow] Error details:', JSON.stringify(event, null, 2));
          console.error('🍎 [useApplePayFlow] Error type:', typeof event);
          console.error('🍎 [useApplePayFlow] Error keys:', Object.keys(event || {}));
          
          clearTimeout(timeoutId);
          setIsProcessing(false);
          
          toast({
            title: "Apple Pay Error",
            description: "Unable to complete Apple Pay authorization. Please try a different payment method.",
            variant: "destructive",
          });
          
          const errorResponse: PaymentResponse = {
            success: false,
            error: 'APPLE_PAY_ERROR',
            retryable: true
          };
          
          params.onError?.({
            type: 'retryable',
            message: 'Apple Pay authorization failed',
            originalError: event
          });
          
          reject(new Error('Apple Pay authorization failed'));
        };

        console.log('🍎 [useApplePayFlow] Starting Apple Pay session...');
        console.log('🍎 [useApplePayFlow] Session state before begin:', {
          hasOnValidateMerchant: !!session.onvalidatemerchant,
          hasOnPaymentAuthorized: !!session.onpaymentauthorized,
          hasOnCancel: !!session.oncancel,
          hasOnError: !!session.onerror
        });

        try {
          session.begin();
          console.log('🍎 [useApplePayFlow] ✅ Session.begin() called successfully');
        } catch (beginError) {
          console.error('🍎 [useApplePayFlow] ❌ Error calling session.begin():', beginError);
          setIsProcessing(false);
          reject(beginError);
          return;
        }

      } catch (err) {
        console.error('🍎 [useApplePayFlow] ❌ Setup error:', err);
        setIsProcessing(false);
        reject(err);
      }
    });
  }, [user, params, toast]);

  return {
    isAvailable,
    isCheckingAvailability,
    isProcessing,
    handleApplePayPayment
  };
};
