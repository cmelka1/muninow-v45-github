import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useApplePayFlow } from '@/hooks/useApplePayFlow';
import type { EntityType } from '@/hooks/useUnifiedPaymentFlow';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
    console.log('🍎 [ApplePayButton] Checking session validity...', { hasSession: !!session });
    
    if (!session) {
      console.log('🍎 [ApplePayButton] ❌ No session object');
      return false;
    }
    
    if (!session.expires_at) {
      console.log('🍎 [ApplePayButton] ⚠️ Session missing expires_at, assuming valid');
      return true; // More lenient - assume valid if no expiry
    }
    
    const expiresAt = session.expires_at || 0;
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - currentTime;
    
    const isValid = timeUntilExpiry > 60;
    console.log('🍎 [ApplePayButton] Session validity result:', {
      expiresAt,
      currentTime,
      timeUntilExpiry,
      isValid,
      minutesRemaining: Math.floor(timeUntilExpiry / 60)
    });
    
    return isValid;
  }, [session]);

  const { isAvailable, isCheckingAvailability, isProcessing, handleApplePayPayment } = useApplePayFlow({
    entityType,
    entityId,
    merchantId,
    totalAmountCents,
    finixSessionKey,
    onSuccess,
    onError
  });

  // DEBUG: Log authentication and session state
  console.log('🍎 [ApplePayButton] Component rendered with:', {
    hasUser: !!user,
    userId: user?.id,
    hasSession: !!session,
    sessionExpiresAt: session?.expires_at,
    currentTime: Math.floor(Date.now() / 1000),
    isDisabled,
    isAvailable,
    isCheckingAvailability,
    isProcessing
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
    console.log('🍎 [ApplePayButton] Setting up click handler...');
    const el = btnRef.current;
    
    if (!el) {
      console.error('🍎 [ApplePayButton] ❌ btnRef.current is NULL - click handler NOT attached!');
      return;
    }
    
    console.log('🍎 [ApplePayButton] ✅ btnRef.current exists, attaching click handler', el);
    
    const clickHandler = (e: Event) => {
      console.log('🍎 [ApplePayButton] 🎯 CLICK EVENT FIRED!', e);
      e.preventDefault();
      e.stopPropagation();
      void safeHandleClick();
    };
    
    el.addEventListener('click', clickHandler);
    console.log('🍎 [ApplePayButton] ✅ Click handler attached successfully');
    
    return () => {
      console.log('🍎 [ApplePayButton] Cleaning up click handler');
      el.removeEventListener('click', clickHandler);
    };
  }, [safeHandleClick]);

  // Attempt to recover session if missing
  useEffect(() => {
    const recoverSession = async () => {
      if (user && !session) {
        console.log('🍎 [ApplePayButton] ⚠️ User exists but no session, attempting recovery...');
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log('🍎 [ApplePayButton] ✅ Session recovered via getSession');
        } else {
          console.error('🍎 [ApplePayButton] ❌ Could not recover session - this will prevent Apple Pay');
        }
      }
    };
    
    recoverSession();
  }, [user, session]);

  // Show loading state
  if (isCheckingAvailability) {
    return (
      <div className="w-full h-[44px] flex items-center justify-center bg-muted rounded border border-border">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking Apple Pay...</span>
      </div>
    );
  }

  // DEBUG: Log render decision
  console.log('🍎 [ApplePayButton] Render decision:', {
    user: !!user,
    isAvailable,
    isSessionValid,
    willRender: !!(user && isAvailable)
  });

  // Temporarily less strict - render if user is authenticated and Apple Pay is available
  if (!user || !isAvailable) {
    console.log('🍎 [ApplePayButton] ❌ NOT RENDERING - user:', !!user, 'isAvailable:', isAvailable);
    return null;
  }

  // Warn if session is questionable but still render
  if (!isSessionValid) {
    console.warn('🍎 [ApplePayButton] ⚠️ Session may be invalid/expiring but rendering button anyway for debugging');
  }

  console.log('🍎 [ApplePayButton] ✅ RENDERING button');

  return (
    <div
      className="relative w-full"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        console.log('🍎 [ApplePayButton] 🎯 WRAPPER DIV CLICKED', e.target);
      }}
      onKeyDown={(e) => {
        console.log('🍎 [ApplePayButton] ⌨️ KEY PRESSED:', e.key);
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
