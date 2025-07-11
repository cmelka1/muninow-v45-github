import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '@/types/googlepay';

interface GooglePayButtonProps {
  isSelected: boolean;
  onSelect: () => void;
  isDisabled?: boolean;
  merchantId?: string;
}

const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  isSelected,
  onSelect,
  isDisabled = false,
  merchantId
}) => {
  const [isGooglePayReady, setIsGooglePayReady] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkGooglePayReadiness = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Checking Google Pay readiness...');
        
        // Check if Google Pay API is loaded
        if (!window.google?.payments?.api) {
          throw new Error('Google Pay API not loaded');
        }

        if (!merchantId) {
          throw new Error('Merchant ID required for Google Pay');
        }

        // Initialize Google Pay client
        if (!window.googlePayClient) {
          window.googlePayClient = new window.google.payments.api.PaymentsClient({
            environment: 'TEST' // Change to 'PRODUCTION' for live
          });
        }

        // Define payment methods for readiness check
        const allowedPaymentMethods: PaymentMethod[] = [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'finix',
              gatewayMerchantId: merchantId
            }
          }
        }];

        const isReadyToPayRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods
        };

        // Check if Google Pay is ready
        const response = await window.googlePayClient.isReadyToPay(isReadyToPayRequest);
        
        console.log('Google Pay readiness response:', response);
        
        setIsGooglePayReady(response.result);
        
        if (response.result) {
          console.log('Google Pay is ready and available');
        } else {
          console.log('Google Pay is not available');
        }
        
      } catch (error) {
        console.error('Google Pay readiness check failed:', error);
        setError(error.message || 'Google Pay not available');
        setIsGooglePayReady(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Only check readiness if merchantId is provided
    if (merchantId) {
      checkGooglePayReadiness();
    } else {
      setIsLoading(false);
      setIsGooglePayReady(false);
      setError('No merchant ID provided');
    }
  }, [merchantId]);

  // Determine if button should be disabled
  const buttonDisabled = isDisabled || isLoading || !isGooglePayReady;

  // Determine button styling based on state
  const getButtonClasses = () => {
    const baseClasses = "border rounded-lg p-3 transition-all";
    
    if (buttonDisabled) {
      return `${baseClasses} opacity-50 cursor-not-allowed border-border`;
    }
    
    if (isSelected) {
      return `${baseClasses} border-primary bg-primary/5 cursor-pointer`;
    }
    
    return `${baseClasses} border-border hover:border-primary/50 cursor-pointer`;
  };

  const handleClick = () => {
    if (!buttonDisabled) {
      onSelect();
    }
  };

  return (
    <div className={getButtonClasses()} onClick={handleClick}>
      <div className="flex items-center justify-center relative">
        <img 
          src="/lovable-uploads/c2b3d2f7-9a1c-480f-9b7f-eca749490b01.png"
          alt="Google Pay"
          className="h-6 w-auto object-contain"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 rounded">
            <span className="text-xs text-red-600 font-medium">Unavailable</span>
          </div>
        )}
      </div>
      
      {/* Status indicator */}
      <div className="text-center mt-1">
        {isLoading && (
          <span className="text-xs text-muted-foreground">Checking...</span>
        )}
        {!isLoading && error && (
          <span className="text-xs text-red-600">Not available</span>
        )}
        {!isLoading && isGooglePayReady && (
          <span className="text-xs text-green-600">Ready</span>
        )}
        {!isLoading && isGooglePayReady === false && !error && (
          <span className="text-xs text-muted-foreground">Not supported</span>
        )}
      </div>
    </div>
  );
};

export default GooglePayButton;