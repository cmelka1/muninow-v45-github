import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface GooglePayButtonProps {
  onPayment: () => Promise<void>;
  totalAmount: number;
  merchantId?: string;
  isDisabled?: boolean;
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  onPayment,
  totalAmount,
  merchantId,
  isDisabled = false,
  onAvailabilityChange
}) => {
  const [isGooglePayReady, setIsGooglePayReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkGooglePayAvailability = async () => {
      try {
        if (!window.google?.payments?.api) {
          setIsLoading(false);
          return;
        }

        // Use explicit VITE_GOOGLE_PAY_ENV only (not PROD)
        // This allows testing with Finix SANDBOX on deployed production builds
        const isProduction = import.meta.env.VITE_GOOGLE_PAY_ENV === 'PRODUCTION';
        console.log('🌍 GooglePayButton environment:', isProduction ? 'PRODUCTION' : 'TEST');
        const paymentsClient = new window.google.payments.api.PaymentsClient({
          environment: isProduction ? 'PRODUCTION' : 'TEST'
        });

        window.googlePayClient = paymentsClient;

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

        const response = await paymentsClient.isReadyToPay(isReadyToPayRequest);
        setIsGooglePayReady(response.result);
        onAvailabilityChange?.(response.result);
      } catch (error) {
        console.error('Error checking Google Pay availability:', error);
        setIsGooglePayReady(false);
        onAvailabilityChange?.(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkGooglePayAvailability();
  }, []);

  const handleClick = async () => {
    console.group('🔘 GOOGLE_PAY_BUTTON_CLICK');
    console.log('Button state:', { isDisabled, isProcessing, isGooglePayReady, merchantId });
    
    if (isDisabled || isProcessing || !isGooglePayReady) {
      console.log('❌ Click blocked:', { isDisabled, isProcessing, isGooglePayReady });
      console.groupEnd();
      return;
    }

    try {
      console.log('✅ Starting Google Pay flow...');
      setIsProcessing(true);
      await onPayment();
      console.log('✅ Google Pay flow completed successfully');
    } catch (error) {
      console.error('❌ Google Pay payment error:', error);
    } finally {
      setIsProcessing(false);
      console.groupEnd();
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-2.5 border-border opacity-50">
        <div className="flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Checking Google Pay...</span>
        </div>
      </div>
    );
  }

  if (!isGooglePayReady) {
    return null; // Don't show button if Google Pay isn't available
  }

  // Google Pay Brand Guidelines: Black button on light backgrounds
  // Official button from: https://developers.google.com/pay/api/web/guides/brand-guidelines
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled || isProcessing}
      className={`w-full rounded-lg transition-all ${
        isDisabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:opacity-80'
      }`}
      style={{
        backgroundColor: '#000000',
        border: 'none',
        padding: '12px 24px',
        minHeight: '48px',
        minWidth: '90px',
        cursor: isDisabled || isProcessing ? 'not-allowed' : 'pointer'
      }}
      aria-label="Pay with Google Pay"
    >
      <div className="flex items-center justify-center gap-2">
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 435.97 173.13"
            className="h-7 w-auto"
            aria-hidden="true"
          >
            {/* Google Pay logo - white on black */}
            <path fill="#fff" d="M206.2,84.58v50.75H190.1V10h42.7a38.61,38.61,0,0,1,27.65,10.85A34.88,34.88,0,0,1,272,47.3a34.72,34.72,0,0,1-11.55,26.6q-11.2,10.68-27.65,10.67H206.2Zm0-59.15V69.18h27a21.28,21.28,0,0,0,15.93-6.48,21.36,21.36,0,0,0,0-30.63,21,21,0,0,0-15.93-6.65h-27Z"/>
            <path fill="#fff" d="M309.1,46.78q17.85,0,28.18,9.54T347.6,82.83v52.5H332.2V121.88h-.7q-10,17.33-26.6,17.32-14.17,0-23.71-8.4a26.82,26.82,0,0,1-9.54-21q0-13.31,10.06-21.18t26.86-7.87q14.35,0,23.62,5.25V82.48a18.39,18.39,0,0,0-6.65-14.35,23.64,23.64,0,0,0-16.28-6q-14.17,0-22.4,11.9l-14.17-8.93Q283.35,46.78,309.1,46.78Zm-20.82,62.3a12.86,12.86,0,0,0,5.34,10.5,19.64,19.64,0,0,0,12.51,4.2,25.67,25.67,0,0,0,18.11-7.52q8-7.53,8-17.5-7.53-6-21.35-6-10.07,0-16.36,4.81C290,101.11,288.28,104.93,288.28,109.08Z"/>
            <path fill="#fff" d="M436,49.28,382.24,173.13H365.79l19.95-43.23L350.54,49.28h17.5l25.55,61.6h.35l24.85-61.6Z"/>
            <path fill="#4285F4" d="M141.14,73.64A85.79,85.79,0,0,0,139.9,59H72V86.73h38.89a33.33,33.33,0,0,1-14.38,21.88v18h23.21C133.31,114.08,141.14,95.55,141.14,73.64Z"/>
            <path fill="#34A853" d="M72,144c19.43,0,35.79-6.38,47.72-17.38l-23.21-18C90.05,113,81.73,115.5,72,115.5c-18.78,0-34.72-12.66-40.42-29.72H7.67v18.55A72,72,0,0,0,72,144Z"/>
            <path fill="#FBBC04" d="M31.58,85.78a43.14,43.14,0,0,1,0-27.56V39.67H7.67a72,72,0,0,0,0,64.66Z"/>
            <path fill="#EA4335" d="M72,28.5a39.09,39.09,0,0,1,27.62,10.8l20.55-20.55A69.18,69.18,0,0,0,72,0,72,72,0,0,0,7.67,39.67L31.58,58.22C37.28,41.16,53.22,28.5,72,28.5Z"/>
          </svg>
        )}
      </div>
    </button>
  );
};

export default GooglePayButton;