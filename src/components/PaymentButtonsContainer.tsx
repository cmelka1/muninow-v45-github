import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GooglePayButton from './GooglePayButton';
import ApplePayButton from './ApplePayButton';
import type { EntityType } from '@/hooks/useUnifiedPaymentFlow';

interface PaymentButtonsContainerProps {
  entityType: EntityType;
  entityId: string;
  merchantId: string;
  totalAmountCents: number;
  finixSessionKey?: string;
  isDisabled?: boolean;
  onGooglePayment: () => Promise<void>;
  onApplePaySuccess?: (response: any) => void;
  onApplePayError?: (error: any) => void;
}

const PaymentButtonsContainer: React.FC<PaymentButtonsContainerProps> = ({
  entityType,
  entityId,
  merchantId,
  totalAmountCents,
  finixSessionKey,
  isDisabled = false,
  onGooglePayment,
  onApplePaySuccess,
  onApplePayError
}) => {
  const { user } = useAuth();

  return (
    <div className="space-y-3 w-full">
      <div className="text-sm text-muted-foreground text-center mb-2">
        Express Checkout
      </div>
      
      <GooglePayButton
        onPayment={onGooglePayment}
        totalAmount={totalAmountCents / 100}
        merchantId={merchantId}
        isDisabled={isDisabled}
      />
      
      {user ? (
        <ApplePayButton
          entityType={entityType}
          entityId={entityId}
          merchantId={merchantId}
          totalAmountCents={totalAmountCents}
          finixSessionKey={finixSessionKey}
          isDisabled={isDisabled}
          onSuccess={onApplePaySuccess}
          onError={onApplePayError}
        />
      ) : (
        <div className="w-full h-[44px] flex items-center justify-center bg-muted rounded border border-border">
          <span className="text-xs text-muted-foreground">Login required for Apple Pay</span>
        </div>
      )}
      
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or pay with card
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentButtonsContainer;