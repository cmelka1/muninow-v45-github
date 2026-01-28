import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Plus, Loader2 } from 'lucide-react';
import { InlinePaymentSummary } from './InlinePaymentSummary';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import GooglePayButton from '@/components/GooglePayButton';
import ApplePayButton from '@/components/ApplePayButton';
import { useUnifiedPaymentFlow, EntityType } from '@/hooks/useUnifiedPaymentFlow';
import { useGooglePay } from '@/hooks/useGooglePay';
import { PaymentResponse } from '@/types/payment';
import { formatCurrency } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    paymentMethodsLoading,
    finixSessionKey,
    handlePayment,
  } = useUnifiedPaymentFlow({
    entityType,
    entityId,
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

  // Use new dedicated Google Pay hook
  const {
    isReady: isGooglePayReady,
    isLoading: isGooglePayLoading,
    isProcessing: isGooglePayProcessing,
    initiatePayment: initiateGooglePayment,
    merchantConfig: googlePayMerchantConfig,
  } = useGooglePay({
    entityType,
    entityId,
    merchantId,
    baseAmountCents,
    serviceFeeAmountCents: serviceFee?.serviceFeeToDisplay,
    onSuccess: (response) => {
      console.log('🎊 Google Pay success via new hook:', response);
      setShowSuccess(true);
      onPaymentSuccess?.(response);
      setTimeout(() => {
        setShowSuccess(false);
        setIsExpanded(false);
      }, 3000);
    },
    onError: (error) => {
      console.error('❌ Google Pay error via new hook:', error);
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

  if (!isExpanded && !initialExpanded) {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{feeLabel}</span>
            <span className="font-semibold">{formatCurrency(baseAmountCents)}</span>
          </div>
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
        <div className="space-y-3">
          {isGooglePayLoading && (
            <div className="text-sm text-muted-foreground text-center py-2">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Loading Google Pay...
            </div>
          )}
          
          <div className="flex justify-center">
            <div className="w-full">
              <GooglePayButton
                onPayment={async () => {
                  try {
                    console.log('🎯 Initiating Google Pay via new hook');
                    console.log('   merchantConfig:', googlePayMerchantConfig);
                    await initiateGooglePayment();
                  } catch (error) {
                    console.error('Google Pay error in button:', error);
                  }
                }}
                totalAmount={totalWithFee}
                merchantId={googlePayMerchantConfig?.googleMerchantId || ''}
                isDisabled={!isGooglePayReady || isProcessingPayment || isGooglePayProcessing}
                onAvailabilityChange={setIsGooglePayAvailable}
              />
            </div>
          </div>

          <div className="flex justify-center">
            {user ? (
              <ApplePayButton
                entityType={entityType}
                entityId={entityId}
                merchantId={merchantId}
                totalAmountCents={totalWithFee}
                finixSessionKey={finixSessionKey}
                isDisabled={isProcessingPayment}
                onSuccess={(response) => {
                  setShowSuccess(true);
                  onPaymentSuccess?.(response);
                  setTimeout(() => {
                    setShowSuccess(false);
                    setIsExpanded(false);
                  }, 3000);
                }}
                onError={onPaymentError}
                onAvailabilityChange={setIsApplePayAvailable}
              />
            ) : (
              <div className="w-full h-[44px] flex items-center justify-center bg-muted rounded border border-border">
                <span className="text-xs text-muted-foreground">Login required for Apple Pay</span>
              </div>
            )}
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