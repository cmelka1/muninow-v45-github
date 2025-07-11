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
        <img 
          src="https://qcuiuubbaozcmejzvxje.supabase.co/storage/v1/object/public/apple-pay-logo/Apple_Pay-White-Logo.png"
          alt="Apple Pay"
          className="h-6 w-auto object-contain"
        />
        {isProcessing && <span className="ml-2 text-sm">Processing...</span>}
      </div>
    </div>
  );
};

export default ApplePayButton;