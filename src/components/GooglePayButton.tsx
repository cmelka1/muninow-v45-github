import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import type { PaymentsClient, IsReadyToPayRequest, PaymentMethod, PaymentDataRequest, PaymentData } from '@/types/googlepay';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GooglePayButtonProps {
  merchantId: string;
  billAmount: number;
  merchantName: string;
  billId: string;
  googlePayMerchantId?: string;
  isDisabled?: boolean;
  onClick?: () => void;
}

const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  merchantId,
  billAmount,
  merchantName,
  billId,
  googlePayMerchantId,
  isDisabled = false,
  onClick
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeGooglePay = async () => {
      try {
        // Wait for Google Pay client to be available
        if (!window.googlePayClient) {
          setIsLoading(false);
          return;
        }

        // Step 2: Define Google Pay API Version
        const baseRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
        };

        // Step 3: Request a Finix Payment Token
        const tokenizationSpecification = {
          type: "PAYMENT_GATEWAY" as const,
          parameters: {
            gateway: "finix" as const,
            gatewayMerchantId: merchantId,
          },
        };

        // Step 4: Define Allowed Card Networks
        const allowedCardNetworks = [
          "AMEX",
          "DISCOVER",
          "INTERAC",
          "JCB",
          "MASTERCARD",
          "VISA",
        ];
        const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

        // Step 5: Describe Allowed Payment Methods
        const baseCardPaymentMethod: PaymentMethod = {
          type: "CARD",
          parameters: {
            allowedAuthMethods: allowedCardAuthMethods,
            allowedCardNetworks: allowedCardNetworks,
          },
        };

        const cardPaymentMethod = {
          ...baseCardPaymentMethod,
          tokenizationSpecification: tokenizationSpecification,
        };

        // Step 8: Create a Payment Data Request
        const paymentDataRequest: PaymentDataRequest = {
          ...baseRequest,
          allowedPaymentMethods: [cardPaymentMethod],
          transactionInfo: {
            countryCode: 'US',
            currencyCode: 'USD',
            totalPrice: (billAmount / 100).toFixed(2),
            totalPriceStatus: 'FINAL' as const,
          },
          merchantInfo: {
            merchantId: googlePayMerchantId || '12345678901234567890', // TEST merchant ID
            merchantName: merchantName,
          },
        };

        // Step 9: Handle Google Pay payment processing
        const processGooglePayPayment = async () => {
          try {
            if (!window.googlePayClient) {
              throw new Error('Google Pay client not initialized');
            }

            // Load payment data from Google Pay
            const paymentData: PaymentData = await window.googlePayClient.loadPaymentData(paymentDataRequest);
            
            console.log('Google Pay payment data received:', paymentData);

            // Extract token and billing info
            const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
            const billingAddress = paymentData.paymentMethodData.info?.billingAddress;

            // Generate idempotency ID
            const idempotencyId = `googlepay_${billId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Call our edge function to process the payment
            const { data, error } = await supabase.functions.invoke('process-google-pay-transfer', {
              body: {
                bill_id: billId,
                google_pay_token: paymentToken,
                total_amount_cents: billAmount,
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
              toast.success('Payment successful!');
              if (data.redirect_url) {
                window.location.href = data.redirect_url;
              }
            } else {
              throw new Error(data?.error || 'Payment failed');
            }

          } catch (error) {
            console.error('Google Pay payment error:', error);
            toast.error(error.message || 'Payment failed. Please try again.');
          }
        };

        // Step 6: Check Readiness to Pay with Google Pay
        const isReadyToPayRequest: IsReadyToPayRequest = {
          ...baseRequest,
          allowedPaymentMethods: [baseCardPaymentMethod],
        };

        const response = await window.googlePayClient.isReadyToPay(isReadyToPayRequest);
        
        if (response.result) {
          setIsReady(true);
          
          // Step 7: Add the Google Pay Button
          if (containerRef.current) {
            const button = window.googlePayClient.createButton({
              onClick: () => {
                if (onClick) {
                  onClick();
                } else if (!isDisabled) {
                  processGooglePayPayment();
                } else {
                  console.log("Google Pay button clicked but disabled");
                }
              },
              allowedPaymentMethods: [cardPaymentMethod],
              buttonColor: 'default',
              buttonType: 'pay',
            });
            
            // Clear container and add button
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(button);
          }
        }
      } catch (error) {
        console.error('Error initializing Google Pay:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize Google Pay when component mounts
    initializeGooglePay();
  }, [merchantId, billAmount, merchantName, billId, googlePayMerchantId, onClick, isDisabled]);

  if (isLoading) {
    return (
      <Card className={`p-4 border-2 border-dashed ${isDisabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Loading Google Pay...</span>
        </div>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <Card className={`p-4 border-2 border-dashed ${isDisabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-center space-x-3">
          <img 
            src="https://qcuiuubbaozncmejzvxje.supabase.co/storage/v1/object/public/google-pay-button/Google_Pay_Logo.png"
            alt="Google Pay"
            className="h-6 w-auto"
          />
          <span className="text-sm text-muted-foreground">Google Pay not available</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-3 border-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src="https://qcuiuubbaozncmejzvxje.supabase.co/storage/v1/object/public/google-pay-button/Google_Pay_Logo.png"
            alt="Google Pay"
            className="h-6 w-auto"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Google Pay</p>
            {isDisabled && (
              <p className="text-xs text-muted-foreground">Coming soon</p>
            )}
          </div>
        </div>
      </div>
      {/* Google Pay button container */}
      <div ref={containerRef} className="mt-2" style={{ display: isDisabled ? 'none' : 'block' }} />
    </Card>
  );
};

export default GooglePayButton;