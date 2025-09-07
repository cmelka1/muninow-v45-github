import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Plus, Loader2 } from 'lucide-react';
import { InlinePaymentSummary } from './InlinePaymentSummary';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { useUnifiedPaymentFlow, EntityType } from '@/hooks/useUnifiedPaymentFlow';
import { PaymentResponse } from '@/types/payment';

interface InlinePaymentFlowProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  customerId: string;
  merchantId: string;
  baseAmountCents: number;
  initialExpanded?: boolean;
  onPaymentSuccess?: (response: PaymentResponse) => void;
  onPaymentError?: (error: any) => void;
  onAddPaymentMethod?: () => void;
}

export const InlinePaymentFlow: React.FC<InlinePaymentFlowProps> = ({
  entityType,
  entityId,
  entityName,
  customerId,
  merchantId,
  baseAmountCents,
  initialExpanded = false,
  onPaymentSuccess,
  onPaymentError,
  onAddPaymentMethod,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    paymentMethodsLoading,
    googlePayMerchantId,
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
  } = useUnifiedPaymentFlow({
    entityType,
    entityId,
    customerId,
    merchantId,
    baseAmountCents,
    onSuccess: (response) => {
      setShowSuccess(true);
      onPaymentSuccess?.(response);
      setTimeout(() => {
        setShowSuccess(false);
        setIsExpanded(false);
      }, 3000);
    },
    onError: (error) => {
      onPaymentError?.(error);
    },
  });

  const selectedPaymentInstrument = paymentInstruments.find(p => p.id === selectedPaymentMethod);
  const isGooglePay = selectedPaymentMethod === 'google-pay';
  const isApplePay = selectedPaymentMethod === 'apple-pay';

  const paymentMethodType = isGooglePay ? 'google-pay' : 
                           isApplePay ? 'apple-pay' :
                           selectedPaymentInstrument?.instrument_type === 'PAYMENT_CARD' ? 'card' : 'ach';

  const selectedPaymentMethodName = isGooglePay ? 'Google Pay' :
                                   isApplePay ? 'Apple Pay' :
                                   selectedPaymentInstrument?.display_name || '';

  if (showSuccess) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
            <div>
              <h3 className="font-semibold text-foreground">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Payment of ${(totalWithFee / 100).toFixed(2)} processed successfully.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Permit Fee</span>
            <span className="font-semibold">${(baseAmountCents / 100).toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Complete payment to receive your permit
          </p>
        </div>
        
        <Button 
          className="w-full" 
          onClick={() => setIsExpanded(true)}
          disabled={isProcessingPayment}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Pay Now
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InlinePaymentSummary
        entityName={entityName}
        baseAmount={baseAmountCents}
        serviceFee={serviceFee?.serviceFeeToDisplay || 0}
        totalAmount={totalWithFee}
        paymentMethodType={paymentMethodType}
        selectedPaymentMethodName={selectedPaymentMethodName}
      />

      <Separator />

      <div className="space-y-3">
        <h4 className="font-medium text-foreground text-sm">Select Payment Method</h4>
        
        <PaymentMethodSelector
          paymentInstruments={paymentInstruments}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          isLoading={paymentMethodsLoading}
          maxMethods={2}
        />

        {/* Digital Payment Options */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!isProcessingPayment) {
                handleGooglePayment();
              }
            }}
            disabled={!googlePayMerchantId || isProcessingPayment}
            className="flex-1 text-xs"
            size="sm"
          >
            {isProcessingPayment ? 'Processing...' : 'Google Pay'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (!isProcessingPayment) {
                handleApplePayment();
              }
            }}
            disabled={isProcessingPayment}
            className="flex-1 text-xs"
            size="sm"
          >
            {isProcessingPayment ? 'Processing...' : 'Apple Pay'}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Button
          onClick={() => {
            // Prevent double-clicking
            if (!isProcessingPayment) {
              handlePayment();
            }
          }}
          disabled={!selectedPaymentMethod || isProcessingPayment || !serviceFee}
          className="w-full"
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            `Pay $${(totalWithFee / 100).toFixed(2)}`
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onAddPaymentMethod}
          disabled={isProcessingPayment}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Payment Method
        </Button>

        <Button
          variant="ghost"
          onClick={() => setIsExpanded(false)}
          disabled={isProcessingPayment}
          className="w-full"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};