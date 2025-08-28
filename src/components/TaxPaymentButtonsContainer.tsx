import React from 'react';
import { Button } from '@/components/ui/button';
import ApplePayButton from '@/components/ApplePayButton';
import GooglePayButton from '@/components/GooglePayButton';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxPaymentButtonsContainerProps {
  isProcessingPayment: boolean;
  areUploadsInProgress: boolean;
  uploadingCount: number;
  allUploadsComplete: boolean;
  hasDocuments: boolean;
  onPayment: () => Promise<void>;
  onGooglePayment?: () => Promise<void>;
  onApplePayment?: () => Promise<void>;
  googlePayMerchantId?: string | null;
  totalAmount: number;
  disabled?: boolean;
}

export const TaxPaymentButtonsContainer: React.FC<TaxPaymentButtonsContainerProps> = ({
  isProcessingPayment,
  areUploadsInProgress,
  uploadingCount,
  allUploadsComplete,
  hasDocuments,
  onPayment,
  onGooglePayment,
  onApplePayment,
  googlePayMerchantId,
  totalAmount,
  disabled = false
}) => {
  const isPaymentDisabled = disabled || isProcessingPayment || areUploadsInProgress;
  const showUploadWarning = areUploadsInProgress || (!allUploadsComplete && hasDocuments);

  return (
    <div className="space-y-4">
      {/* Upload Status Warning */}
      {showUploadWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {areUploadsInProgress 
              ? `Please wait for ${uploadingCount} document${uploadingCount > 1 ? 's' : ''} to finish uploading before proceeding with payment.`
              : 'Some documents may still be uploading. Please ensure all uploads are complete before payment.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Buttons */}
      <div className="space-y-3">
        {/* Main Payment Button */}
        <Button 
          onClick={onPayment} 
          disabled={isPaymentDisabled}
          className="w-full"
          size="lg"
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : areUploadsInProgress ? (
            `Wait for Uploads (${uploadingCount} remaining)`
          ) : (
            `Pay Now`
          )}
        </Button>

        {/* Alternative Payment Methods */}
        {onGooglePayment && googlePayMerchantId && (
          <GooglePayButton
            onPayment={onGooglePayment}
            bill={{ amount: totalAmount }}
            totalAmount={totalAmount}
            merchantId={googlePayMerchantId}
            isDisabled={isPaymentDisabled}
          />
        )}

        {onApplePayment && (
          <ApplePayButton
            bill={{ amount: totalAmount }}
            totalAmount={totalAmount}
            isDisabled={isPaymentDisabled}
            onPaymentComplete={(success, error) => {
              if (success) {
                onApplePayment();
              } else if (error && !error.includes('cancelled')) {
                console.error('Apple Pay payment failed:', error);
              }
            }}
          />
        )}
      </div>

      {/* Upload Status Footer */}
      {hasDocuments && allUploadsComplete && !areUploadsInProgress && (
        <div className="text-xs text-success text-center">
          All documents uploaded successfully. Ready for payment.
        </div>
      )}
    </div>
  );
};