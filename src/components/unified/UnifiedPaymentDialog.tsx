import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { UnifiedPaymentSummary } from './UnifiedPaymentSummary';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { useUnifiedPaymentFlow, EntityType } from '@/hooks/useUnifiedPaymentFlow';
import { PaymentResponse } from '@/types/payment';
import { useAuth } from '@/contexts/AuthContext';
import ApplePayButton from '@/components/ApplePayButton';

interface UnifiedPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  merchantId: string;
  baseAmountCents: number;
  onPaymentSuccess?: (response: PaymentResponse) => void;
  onPaymentError?: (error: any) => void;
}

export const UnifiedPaymentDialog: React.FC<UnifiedPaymentDialogProps> = ({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  merchantId,
  baseAmountCents,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [currentStep, setCurrentStep] = useState<'payment' | 'processing' | 'success'>('payment');
  const { user } = useAuth();

  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    paymentMethodsLoading,
    googlePayMerchantId,
    finixSessionKey,
    handlePayment,
    handleGooglePayment,
  } = useUnifiedPaymentFlow({
    entityType,
    entityId,
    merchantId,
    baseAmountCents,
    onSuccess: (response) => {
      setCurrentStep('success');
      onPaymentSuccess?.(response);
      setTimeout(() => {
        onOpenChange(false);
        setCurrentStep('payment');
      }, 2000);
    },
    onError: (error) => {
      onPaymentError?.(error);
    },
  });

  const handleClose = () => {
    if (!isProcessingPayment) {
      onOpenChange(false);
      setCurrentStep('payment');
    }
  };

  const selectedPaymentInstrument = paymentInstruments.find(p => p.id === selectedPaymentMethod);
  const isGooglePay = selectedPaymentMethod === 'google-pay';
  const isApplePay = selectedPaymentMethod === 'apple-pay';

  const paymentMethodType = isGooglePay ? 'google-pay' : 
                           isApplePay ? 'apple-pay' :
                           selectedPaymentInstrument?.instrument_type === 'PAYMENT_CARD' ? 'card' : 'ach';

  const selectedPaymentMethodName = isGooglePay ? 'Google Pay' :
                                   isApplePay ? 'Apple Pay' :
                                   selectedPaymentInstrument?.display_name || '';

  if (currentStep === 'success') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground">
              Your payment of ${(totalWithFee / 100).toFixed(2)} has been processed successfully.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <UnifiedPaymentSummary
            entityType={entityType}
            entityName={entityName}
            baseAmount={baseAmountCents}
            serviceFee={serviceFee?.serviceFeeToDisplay || 0}
            totalAmount={totalWithFee}
            paymentMethodType={paymentMethodType}
            selectedPaymentMethodName={selectedPaymentMethodName}
          />

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Select Payment Method</h3>
            
            <PaymentMethodSelector
              paymentInstruments={paymentInstruments}
              selectedPaymentMethod={selectedPaymentMethod}
              onSelectPaymentMethod={setSelectedPaymentMethod}
              isLoading={paymentMethodsLoading}
            />

            {/* Express checkout options */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleGooglePayment}
                disabled={!googlePayMerchantId || isProcessingPayment}
                className="flex-1"
              >
                Google Pay
              </Button>
              <div className="flex-1">
                {user ? (
                  <ApplePayButton
                    entityType={entityType}
                    entityId={entityId}
                    merchantId={merchantId}
                    totalAmountCents={totalWithFee}
                    finixSessionKey={finixSessionKey}
                    isDisabled={isProcessingPayment}
                    onSuccess={(response) => {
                      setCurrentStep('success');
                      onPaymentSuccess?.(response);
                      setTimeout(() => {
                        onOpenChange(false);
                        setCurrentStep('payment');
                      }, 2000);
                    }}
                    onError={onPaymentError}
                    onAvailabilityChange={(available) => console.log('Apple Pay available:', available)}
                  />
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Login required for Apple Pay
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessingPayment}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handlePayment()}
              disabled={!selectedPaymentMethod || isProcessingPayment || !serviceFee}
              className="flex-1"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${(totalWithFee / 100).toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};