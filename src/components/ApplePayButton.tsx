import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import applePayLogo from '@/assets/apple-pay-logo.png';

interface ApplePayButtonProps {
  bill: any;
  totalAmount: number;
  isDisabled?: boolean;
  onPaymentComplete: (success: boolean, error?: string) => void;
}

const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  bill,
  totalAmount,
  isDisabled = false,
  onPaymentComplete
}) => {
  const [isApplePayReady, setIsApplePayReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkApplePayAvailability = async () => {
      try {
        // Check if Apple Pay is available
        if (!window.ApplePaySession) {
          console.log('Apple Pay not available - ApplePaySession not found');
          setIsLoading(false);
          return;
        }

        // Check if device supports Apple Pay
        if (!window.ApplePaySession.canMakePayments()) {
          console.log('Apple Pay not available - device cannot make payments');
          setIsLoading(false);
          return;
        }

        setIsApplePayReady(true);
      } catch (error) {
        console.error('Error checking Apple Pay availability:', error);
        setIsApplePayReady(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkApplePayAvailability();
  }, []);

  const createAndStartApplePaySession = (description: string, amount: string) => {
    const paymentRequest = {
      countryCode: "US",
      currencyCode: "USD",
      merchantCapabilities: ["supports3DS"],
      supportedNetworks: ["visa", "masterCard", "amex", "discover"],
      total: { 
        label: description, 
        amount: amount 
      },
      requiredBillingContactFields: ["postalAddress"]
    };

    const applePaySession = new window.ApplePaySession(6, paymentRequest);

    // Handle merchant validation
    applePaySession.onvalidatemerchant = async (event) => {
      try {
        console.log('Apple Pay onvalidatemerchant triggered', event);
        
        // Import supabase client
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Call our edge function to validate with Finix
        const { data, error } = await supabase.functions.invoke('validate-apple-pay-merchant', {
          body: {
            validation_url: event.validationURL,
            merchant_id: bill.merchant_id
          }
        });

        if (error || !data) {
          console.error('Merchant validation failed:', error);
          applePaySession.abort();
          onPaymentComplete(false, 'Merchant validation failed');
          return;
        }
        
        console.log('Completing merchant validation with Finix session');
        applePaySession.completeMerchantValidation(data);
      } catch (error) {
        console.error('Merchant validation failed:', error);
        applePaySession.abort();
        onPaymentComplete(false, 'Merchant validation failed');
      }
    };

    // Handle payment authorization
    applePaySession.onpaymentauthorized = async (event) => {
      try {
        const paymentToken = JSON.stringify(event.payment.token);
        const billingContact = event.payment.billingContact;

        // Generate idempotency ID
        const idempotencyId = `applepay_${bill.bill_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Import supabase client
        const { supabase } = await import('@/integrations/supabase/client');

        // Call our edge function to process the payment
        const { data, error } = await supabase.functions.invoke('process-apple-pay-transfer', {
          body: {
            bill_id: bill.bill_id,
            apple_pay_token: paymentToken,
            total_amount_cents: totalAmount,
            idempotency_id: idempotencyId,
            billing_contact: billingContact ? {
              givenName: billingContact.givenName,
              familyName: billingContact.familyName,
              addressLines: billingContact.addressLines,
              locality: billingContact.locality,
              administrativeArea: billingContact.administrativeArea,
              postalCode: billingContact.postalCode,
              countryCode: billingContact.countryCode
            } : undefined
          }
        });

        if (error || !data?.success) {
          applePaySession.completePayment(window.ApplePaySession.STATUS_FAILURE);
          onPaymentComplete(false, data?.error || error?.message || 'Payment failed');
          return;
        }

        applePaySession.completePayment(window.ApplePaySession.STATUS_SUCCESS);
        onPaymentComplete(true);
        setIsProcessing(false);

      } catch (error) {
        console.error('Apple Pay payment processing error:', error);
        applePaySession.completePayment(window.ApplePaySession.STATUS_FAILURE);
        onPaymentComplete(false, error instanceof Error ? error.message : 'Payment failed');
      }
    };

    // Handle payment cancellation
    applePaySession.oncancel = () => {
      console.log('Apple Pay cancelled by user');
      setIsProcessing(false);
      onPaymentComplete(false, 'Payment cancelled by user');
    };

    applePaySession.begin();
  };

  const handleClick = async () => {
    if (isDisabled || isProcessing || !isApplePayReady) return;

    try {
      setIsProcessing(true);
      const description = bill.merchant_name || bill.business_legal_name || 'Payment';
      const amount = (totalAmount / 100).toFixed(2);
      createAndStartApplePaySession(description, amount);
    } catch (error) {
      console.error('Apple Pay payment error:', error);
      onPaymentComplete(false, error instanceof Error ? error.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-3 border-border opacity-50">
        <div className="flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Checking Apple Pay...</span>
        </div>
      </div>
    );
  }

  if (!isApplePayReady) {
    return null; // Don't show button if Apple Pay isn't available
  }

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all bg-black hover:bg-black/80 h-6 ${
        isDisabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-center h-full">
        <img 
          src={applePayLogo}
          alt="Apple Pay"
          className="h-full w-auto object-contain"
        />
      </div>
    </div>
  );
};

export default ApplePayButton;