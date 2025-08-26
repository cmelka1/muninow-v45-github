import React from 'react';
import { DollarSign, Clock, Plus, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatters';
import { useBusinessLicensePaymentMethods } from '@/hooks/useBusinessLicensePaymentMethods';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import PaymentButtonsContainer from '@/components/PaymentButtonsContainer';
import PermitPaymentSummary from '@/components/PermitPaymentSummary';
import { BusinessLicenseStatusBadge } from '@/components/BusinessLicenseStatusBadge';

interface BusinessLicensePaymentManagementProps {
  license: any;
  onAddPaymentMethod: () => void;
}

export const BusinessLicensePaymentManagement: React.FC<BusinessLicensePaymentManagementProps> = ({
  license,
  onAddPaymentMethod
}) => {
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    topPaymentMethods,
    paymentMethodsLoading,
    googlePayMerchantId,
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
  } = useBusinessLicensePaymentMethods(license);

  // Determine if payment is available (approved and unpaid)
  const isPaymentAvailable = license?.application_status === 'approved' && 
                             license?.payment_status !== 'paid' && 
                             (license?.base_fee_cents > 0 || license?.total_amount_cents > 0);

  // Create bill-like object for PaymentButtonsContainer
  const billLikeObject = {
    bill_id: license?.id,
    user_id: license?.user_id,
    customer_id: license?.customer_id,
    amount_due_cents: license?.base_fee_cents || license?.total_amount_cents || 0,
    merchant_name: license?.merchant_name,
    finix_merchant_id: license?.finix_merchant_id
  };

  const handleRegularPayment = async () => {
    await handlePayment();
  };

  const handleGooglePaymentWrapper = async () => {
    await handleGooglePayment();
  };

  const handleApplePaymentWrapper = async () => {
    await handleApplePayment();
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License Summary Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">License Summary</h3>
          <div className="space-y-2">
            <p className="text-base font-medium">{license?.license_number || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">{license?.business_legal_name}</p>
            <BusinessLicenseStatusBadge status={license?.application_status} />
            
            {/* Payment Status Badge */}
            <div className="flex items-center gap-2">
              {license?.payment_status === 'paid' ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Paid
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                  Unpaid
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {!isPaymentAvailable && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">Payment Not Available</p>
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              {license?.application_status === 'approved' 
                ? (license?.payment_status === 'paid' 
                   ? 'This license has already been paid for.'
                   : 'No payment required for this license.')
                : 'Payment will be available once the license is approved.'}
            </p>
          </div>
        )}

        {/* Payment Section - Only show if payment is available */}
        {isPaymentAvailable && (
          <>
            {/* Separator */}
            <Separator />

            {/* Payment Details */}
            {(license?.base_fee_cents > 0 || license?.total_amount_cents > 0) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Payment Details</h3>
                <PermitPaymentSummary
                  baseAmount={license?.base_fee_cents || license?.total_amount_cents || 0}
                  serviceFee={serviceFee}
                  selectedPaymentMethod={selectedPaymentMethod}
                />
              </div>
            )}

            {/* Separator */}
            <Separator />

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Payment Method</h3>
              </div>

              <PaymentMethodSelector
                paymentInstruments={topPaymentMethods}
                selectedPaymentMethod={selectedPaymentMethod}
                onSelectPaymentMethod={setSelectedPaymentMethod}
                isLoading={paymentMethodsLoading}
                maxMethods={3}
              />

              {/* Payment Options */}
              {license?.finix_merchant_id && googlePayMerchantId && (
                <PaymentButtonsContainer
                  bill={billLikeObject}
                  totalAmount={totalWithFee}
                  merchantId={googlePayMerchantId}
                  isDisabled={isProcessingPayment}
                  onGooglePayment={handleGooglePaymentWrapper}
                  onApplePayment={handleApplePaymentWrapper}
                />
              )}
            </div>

            {/* Separator */}
            <Separator />

            {/* Pay Now Section */}
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                disabled={!selectedPaymentMethod || isProcessingPayment || selectedPaymentMethod === 'google-pay' || selectedPaymentMethod === 'apple-pay'}
                onClick={handleRegularPayment}
              >
                {isProcessingPayment ? 'Processing...' : 
                 selectedPaymentMethod === 'google-pay' ? 'Use Google Pay button above' : 
                 selectedPaymentMethod === 'apple-pay' ? 'Use Apple Pay button above' :
                 `Pay ${formatCurrency(totalWithFee)}`}
              </Button>
             
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={onAddPaymentMethod}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Payment Method
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your payment will be processed securely
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};