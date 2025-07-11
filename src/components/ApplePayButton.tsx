import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ApplePayButtonProps {
  onPayment: () => Promise<void>;
  bill: any;
  totalAmount: number;
  isDisabled?: boolean;
}

const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  onPayment,
  bill,
  totalAmount,
  isDisabled = false
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

  const handleClick = async () => {
    if (isDisabled || isProcessing || !isApplePayReady) return;

    try {
      setIsProcessing(true);
      await onPayment();
    } catch (error) {
      console.error('Apple Pay payment error:', error);
    } finally {
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
      className={`border rounded-lg p-3 cursor-pointer transition-all bg-card hover:bg-accent ${
        isDisabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-center">
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        <div className="flex items-center">
          <svg 
            className="h-6 w-auto" 
            viewBox="0 0 200 50" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="200" height="50" rx="8" fill="black"/>
            <text 
              x="50" 
              y="30" 
              fill="white" 
              fontSize="18" 
              fontFamily="San Francisco, -apple-system, BlinkMacSystemFont, sans-serif"
              fontWeight="500"
            >
              Pay
            </text>
            <path 
              d="M20 15c-2.5 0-4.5 2-4.5 4.5v11c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5v-11c0-2.5-2-4.5-4.5-4.5z" 
              fill="white"
            />
            <path 
              d="M30 18c-1.5 0-2.5 1-2.5 2.5v9c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5v-9c0-1.5-1-2.5-2.5-2.5z" 
              fill="white"
            />
          </svg>
        </div>
        {isProcessing && <span className="ml-2 text-sm">Processing...</span>}
      </div>
    </div>
  );
};

export default ApplePayButton;