import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Plus, Loader2 } from 'lucide-react';
import { InlinePaymentSummary } from './InlinePaymentSummary';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import GooglePayButton from '@/components/GooglePayButton';
import ApplePayButton from '@/components/ApplePayButton';
import { useUnifiedPaymentFlow, EntityType } from '@/hooks/useUnifiedPaymentFlow';
import { PaymentResponse } from '@/types/payment';
import { formatCurrency } from '@/lib/formatters';

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

const getEntityLabels = (entityType: EntityType) => {
  switch (entityType) {
    case 'permit':
      return { feeLabel: 'Permit Fee', completionText: 'Complete payment to receive your permit' };
    case 'business_license':
      return { feeLabel: 'License Fee', completionText: 'Complete payment to receive your license' };
    case 'service_application':
      return { feeLabel: 'Application Fee', completionText: 'Complete payment to process your application' };
    case 'tax_submission':
      return { feeLabel: 'Tax Payment', completionText: 'Complete payment to submit your tax' };
    default:
      return { feeLabel: 'Fee', completionText: 'Complete payment to proceed' };
  }
};

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
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);

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
      console.group('🎊 INLINE_PAYMENT_SUCCESS');
      console.log('Payment success response:', response);
      console.log('Component state before success:', { 
        isExpanded, 
        showSuccess,
        timestamp: new Date().toISOString()
      });
      setShowSuccess(true);
      onPaymentSuccess?.(response);
      console.log('Setting success timeout for 3 seconds');
      console.groupEnd();
      setTimeout(() => {
        console.log('🎊 Success timeout elapsed - hiding success message');
        setShowSuccess(false);
        setIsExpanded(false);
      }, 3000);
    },
    onError: (error) => {
      console.group('❌ INLINE_PAYMENT_ERROR');
      console.log('Payment error received in component:', {
        error,
        errorType: error?.type,
        errorMessage: error?.message,
        isRetryable: error?.retryable,
        timestamp: new Date().toISOString()
      });
      console.log('Component state when error occurred:', {
        isExpanded,
        showSuccess,
        selectedPaymentMethod,
        isProcessingPayment
      });
      console.groupEnd();
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

  const { feeLabel, completionText } = getEntityLabels(entityType);

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
                Payment of {formatCurrency(totalWithFee)} processed successfully.
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
          <p className="text-xs text-muted-foreground">
            {completionText}
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
        feeLabel={feeLabel}
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
        <div className={`flex gap-2 ${isGooglePayAvailable && isApplePayAvailable ? '' : 'justify-center'}`}>
          <div className={isApplePayAvailable ? "flex-1" : "w-full"}>
            <GooglePayButton
              onPayment={async () => {
                try {
                  await handleGooglePayment();
                } catch (error) {
                  console.error('Google Pay error in button:', error);
                }
              }}
              bill={{ id: entityId, name: entityName }}
              totalAmount={totalWithFee}
              merchantId={googlePayMerchantId || ''}
              isDisabled={!googlePayMerchantId || isProcessingPayment}
              onAvailabilityChange={setIsGooglePayAvailable}
            />
          </div>
          <div className={isGooglePayAvailable ? "flex-1" : "w-full max-w-sm"}>
            <ApplePayButton
              bill={{ id: entityId, name: entityName }}
              totalAmount={totalWithFee}
              isDisabled={isProcessingPayment}
              onPaymentComplete={async (success: boolean, error?: string) => {
                if (success) {
                  await handleApplePayment();
                }
              }}
              onAvailabilityChange={setIsApplePayAvailable}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Button
          onClick={() => {
            console.group('🖱️ PAY_BUTTON_CLICKED');
            console.log('Button click state:', {
              isProcessingPayment,
              selectedPaymentMethod,
              hasServiceFee: !!serviceFee,
              timestamp: new Date().toISOString()
            });
            
            // Prevent double-clicking
            if (!isProcessingPayment) {
              console.log('✅ Initiating payment from button click');
              handlePayment();
            } else {
              console.log('⚠️ Payment already processing - ignoring click');
            }
            console.groupEnd();
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
            `Pay ${formatCurrency(totalWithFee)}`
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
      </div>
    </div>
  );
};