import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Declare apple-pay-button custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'apple-pay-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        buttonstyle?: string;
        type?: string;
        locale?: string;
      };
    }
  }
}

interface ApplePayButtonProps {
  onPayment: () => Promise<any>;
  totalAmount: number;
  merchantId: string;
  isDisabled?: boolean;
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  onPayment,
  totalAmount,
  merchantId,
  isDisabled = false,
  onAvailabilityChange
}) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if Apple Pay is available
    const checkAvailability = async () => {
      setIsLoading(true);
      
      if (typeof window === 'undefined') {
        setIsLoading(false);
        setIsAvailable(false);
        onAvailabilityChange?.(false);
        return;
      }

      // Check if ApplePaySession exists and browser supports it
      if (!window.ApplePaySession) {
        console.log('🍎 Apple Pay not supported - ApplePaySession not available');
        setIsLoading(false);
        setIsAvailable(false);
        onAvailabilityChange?.(false);
        return;
      }

      // Check if the device can make Apple Pay payments
      if (!window.ApplePaySession.canMakePayments()) {
        console.log('🍎 Apple Pay not available - Device cannot make payments');
        setIsLoading(false);
        setIsAvailable(false);
        onAvailabilityChange?.(false);
        return;
      }

      console.log('🍎 Apple Pay is available');
      setIsLoading(false);
      setIsAvailable(true);
      onAvailabilityChange?.(true);
    };

    checkAvailability();
  }, [onAvailabilityChange]);

  const handleClick = async () => {
    if (isDisabled) {
      console.log('🍎 Apple Pay button is disabled. merchantId:', merchantId, 'isProcessing:', isProcessing);
      return;
    }
    
    if (isProcessing) {
      console.log('🍎 Apple Pay payment already processing');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🍎 Apple Pay button clicked');
      await onPayment();
    } catch (error) {
      console.error('🍎 Apple Pay error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading state while checking availability
  if (isLoading) {
    return (
      <div className="w-full h-[44px] flex items-center justify-center bg-muted rounded border border-border">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking Apple Pay availability...</span>
      </div>
    );
  }

  // Don't render if Apple Pay is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <div className="relative w-full">
      <apple-pay-button
        buttonstyle="black"
        type="plain"
        locale="en"
        onClick={handleClick}
        style={{
          width: '100%',
          height: '44px',
          borderRadius: '4px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          pointerEvents: isDisabled ? 'none' : 'auto'
        }}
      />
      
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}
      
      {isDisabled && !isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded pointer-events-none">
          <span className="text-xs text-white">Loading payment information...</span>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          apple-pay-button {
            --apple-pay-button-width: 100%;
            --apple-pay-button-height: 44px;
            --apple-pay-button-border-radius: 4px;
            --apple-pay-button-padding: 0px;
            --apple-pay-button-box-sizing: border-box;
          }
        `
      }} />
    </div>
  );
};

export default ApplePayButton;
