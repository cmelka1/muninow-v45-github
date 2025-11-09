import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useApplePayFlow } from '@/hooks/useApplePayFlow';
import type { EntityType } from '@/hooks/useUnifiedPaymentFlow';
import { useAuth } from '@/contexts/AuthContext';

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
  entityType: EntityType;
  entityId: string;
  customerId: string;
  merchantId: string;
  totalAmountCents: number;
  finixSessionKey?: string;
  isDisabled?: boolean;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  entityType,
  entityId,
  customerId,
  merchantId,
  totalAmountCents,
  finixSessionKey,
  isDisabled = false,
  onSuccess,
  onError,
  onAvailabilityChange
}) => {
  const { user, session } = useAuth();
  const btnRef = useRef<HTMLElement | null>(null);

  // Check if session is valid and not expiring soon
  const isSessionValid = useMemo(() => {
    if (!session) return false;
    
    const expiresAt = session.expires_at || 0;
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - currentTime;
    
    return timeUntilExpiry > 60; // At least 1 minute remaining
  }, [session]);

  const { isAvailable, isCheckingAvailability, isProcessing, handleApplePayPayment } = useApplePayFlow({
    entityType,
    entityId,
    customerId,
    merchantId,
    totalAmountCents,
    finixSessionKey,
    onSuccess,
    onError
  });

  // Notify parent of availability changes
  useEffect(() => {
    if (!isCheckingAvailability) {
      onAvailabilityChange?.(isAvailable && !!user && isSessionValid);
    }
  }, [isAvailable, isCheckingAvailability, user, isSessionValid, onAvailabilityChange]);

  const safeHandleClick = useCallback(async () => {
    console.log('🍎 [ApplePayButton] Button clicked');
    
    if (!user) {
      console.log('🍎 [ApplePayButton] ❌ User not authenticated');
      return;
    }
    
    if (isDisabled || isProcessing) {
      console.log('🍎 [ApplePayButton] ⚠️ Button disabled or processing');
      return;
    }

    try {
      await handleApplePayPayment();
    } catch (error) {
      console.error('🍎 [ApplePayButton] ❌ Payment error:', error);
    }
  }, [user, isDisabled, isProcessing, handleApplePayPayment]);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    
    const clickHandler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      void safeHandleClick();
    };
    
    el.addEventListener('click', clickHandler);
    return () => el.removeEventListener('click', clickHandler);
  }, [safeHandleClick]);

  // Show loading state
  if (isCheckingAvailability) {
    return (
      <div className="w-full h-[44px] flex items-center justify-center bg-muted rounded border border-border">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking Apple Pay...</span>
      </div>
    );
  }

  // Don't render if not authenticated, not available, or session invalid
  if (!user || !isAvailable || !isSessionValid) {
    return null;
  }

  return (
    <div
      className="relative w-full"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled && !isProcessing) {
          e.preventDefault();
          void safeHandleClick();
        }
      }}
      aria-disabled={isDisabled || isProcessing}
      aria-label="Pay with Apple Pay"
    >
      <apple-pay-button
        ref={btnRef as any}
        buttonstyle="black"
        type="plain"
        locale="en"
        style={{
          width: '100%',
          height: '44px',
          borderRadius: '4px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          pointerEvents: isDisabled ? 'none' : 'auto',
          display: 'inline-block'
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
