import React, { useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBusinessLicensePaymentMethods } from '@/hooks/useBusinessLicensePaymentMethods';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import PaymentButtonsContainer from '@/components/PaymentButtonsContainer';
import PermitPaymentSummary from '@/components/PermitPaymentSummary';

interface BusinessLicensePaymentManagementProps {
  license: any;
}

const BusinessLicensePaymentManagement: React.FC<BusinessLicensePaymentManagementProps> = ({ license }) => {
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  
  const {
    selectedPaymentMethod,
    serviceFee,
    paymentInstruments,
    isProcessingPayment,
    totalWithFee,
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    setSelectedPaymentMethod,
    loadPaymentInstruments,
    paymentMethodsLoading,
    googlePayMerchantId
  } = useBusinessLicensePaymentMethods(license);

  const handleAddPaymentMethodSuccess = async (paymentMethodId?: string) => {
    await loadPaymentInstruments();
    if (paymentMethodId) {
      setSelectedPaymentMethod(paymentMethodId);
    }
  };

  const baseAmount = license?.base_fee_cents || license?.total_amount_cents || 0;

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Payment Method</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddPaymentDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Payment Method
          </Button>
        </div>
        
        <PaymentMethodSelector
          paymentInstruments={paymentInstruments}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          isLoading={paymentMethodsLoading}
          maxMethods={3}
        />
      </div>

      {/* Payment Summary */}
      <div>
        <h4 className="font-medium mb-4">Payment Summary</h4>
        <PermitPaymentSummary
          baseAmount={baseAmount}
          serviceFee={serviceFee}
          selectedPaymentMethod={selectedPaymentMethod}
        />
      </div>

      {/* Payment Buttons */}
      <div className="space-y-4">
        {/* Google Pay and Apple Pay */}
        <PaymentButtonsContainer
          bill={license}
          totalAmount={totalWithFee}
          merchantId={googlePayMerchantId}
          isDisabled={isProcessingPayment}
          onGooglePayment={async () => { await handleGooglePayment(); }}
          onApplePayment={async () => { await handleApplePayment(); }}
        />

        {/* Regular Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={!selectedPaymentMethod || isProcessingPayment}
          className="w-full"
          size="lg"
        >
          {isProcessingPayment ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay {serviceFee ? `$${(totalWithFee / 100).toFixed(2)}` : 'License Fee'}
            </>
          )}
        </Button>
      </div>

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={handleAddPaymentMethodSuccess}
      />
    </div>
  );
};

export default BusinessLicensePaymentManagement;