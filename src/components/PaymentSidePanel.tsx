import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useBill } from '@/hooks/useBill';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Plus } from 'lucide-react';
import { AddPaymentMethodDialog } from '@/components/profile/AddPaymentMethodDialog';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import PaymentSummary from '@/components/PaymentSummary';
import PaymentButtonsContainer from '@/components/PaymentButtonsContainer';
import PaymentSuccessContent from '@/components/PaymentSuccessContent';

interface PaymentSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
}

const PaymentSidePanel: React.FC<PaymentSidePanelProps> = ({
  open,
  onOpenChange,
  billId,
}) => {
  const navigate = useNavigate();
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const { data: bill, isLoading: billLoading } = useBill(billId);
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    topPaymentMethods,
    paymentMethodsLoading,
    handlePayment,
    googlePayMerchantId,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments,
  } = usePaymentMethods(bill);

  // Check if payment is available for this bill
  const isPaymentAvailable = bill?.finix_merchant_id && !billLoading;
  const paymentUnavailableReason = !bill?.finix_merchant_id ? 
    "Payment processing is not available for this bill. The merchant account may not be fully configured." : 
    null;

  const handlePaymentSuccess = async (result: any) => {
    if (result?.success) {
      setPaymentResult(result);
      setShowSuccessView(true);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessView(false);
    setPaymentResult(null);
    onOpenChange(false);
  };

  const handleViewFullReceipt = () => {
    if (paymentResult?.redirect_url) {
      navigate(paymentResult.redirect_url);
    }
  };

  const handleSidePanelPayment = async () => {
    const result = await handlePayment();
    if (result) {
      await handlePaymentSuccess(result);
    }
  };


  const handleGooglePaySuccess = async () => {
    const result = await handleGooglePayment();
    if (result) {
      await handlePaymentSuccess(result);
    }
  };

  const handleApplePaySuccess = async () => {
    const result = await handleApplePayment();
    if (result) {
      await handlePaymentSuccess(result);
    }
  };

  if (billLoading || !bill) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        {showSuccessView ? (
          <>
            <SheetHeader>
              <SheetTitle>Payment Successful</SheetTitle>
              <SheetDescription>
                Your payment has been processed successfully
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              <PaymentSuccessContent
                paymentResult={paymentResult}
                bill={bill}
                serviceFee={serviceFee}
                selectedPaymentMethod={selectedPaymentMethod}
                onClose={handleCloseSuccess}
                onViewFullReceipt={handleViewFullReceipt}
              />
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Pay Bill</SheetTitle>
              <SheetDescription>
                Complete payment for {bill.merchant_name || 'this bill'}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Bill Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bill Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-base font-medium">{bill.merchant_name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{bill.category || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(bill.due_date)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentSummary
                    baseAmount={bill.total_amount_cents}
                    serviceFee={serviceFee}
                    selectedPaymentMethod={selectedPaymentMethod}
                    compact={true}
                  />
                </CardContent>
              </Card>

              {/* Payment unavailable warning */}
              {!isPaymentAvailable && paymentUnavailableReason && (
                <Card className="border-warning bg-warning/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <X className="h-5 w-5 text-warning" />
                      <p className="text-sm text-warning font-medium">Payment Not Available</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {paymentUnavailableReason}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PaymentMethodSelector
                    paymentInstruments={topPaymentMethods}
                    selectedPaymentMethod={selectedPaymentMethod}
                    onSelectPaymentMethod={setSelectedPaymentMethod}
                    isLoading={paymentMethodsLoading}
                    maxMethods={2}
                  />
                  
                  {/* Google Pay and Apple Pay buttons */}
                  {bill?.merchant_finix_identity_id && googlePayMerchantId && (
                    <PaymentButtonsContainer
                      bill={bill}
                      totalAmount={totalWithFee}
                      merchantId={googlePayMerchantId}
                      isDisabled={isProcessingPayment || !isPaymentAvailable}
                      onGooglePayment={handleGooglePaySuccess}
                      onApplePayment={handleApplePaySuccess}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedPaymentMethod || isProcessingPayment || !isPaymentAvailable}
                  onClick={handleSidePanelPayment}
                >
                  {isProcessingPayment ? 'Processing...' : `Pay ${formatCurrency(totalWithFee / 100)}`}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={() => setIsAddPaymentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Payment Method
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Your payment will be processed securely
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
      
      <AddPaymentMethodDialog
        open={isAddPaymentDialogOpen}
        onOpenChange={setIsAddPaymentDialogOpen}
        onSuccess={async (paymentMethodId) => {
          await loadPaymentInstruments();
          if (paymentMethodId) {
            setSelectedPaymentMethod(paymentMethodId);
          }
        }}
      />
    </Sheet>
  );
};

export default PaymentSidePanel;