import React from 'react';
import { CheckCircle, X, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface PaymentSuccessContentProps {
  paymentResult: any;
  serviceFee: any;
  selectedPaymentMethod: string | null;
  entityType: 'permit' | 'license' | 'tax' | 'service';
  entityData: any;
  onClose: () => void;
  onViewFullReceipt: () => void;
}

const PaymentSuccessContent: React.FC<PaymentSuccessContentProps> = ({
  paymentResult,
  serviceFee,
  selectedPaymentMethod,
  entityType,
  entityData,
  onClose,
  onViewFullReceipt
}) => {
  const baseAmount = entityData?.total_amount_cents || entityData?.amount_cents || 0;
  const totalWithFee = baseAmount + (serviceFee?.totalFee || 0);

  const getEntityLabel = () => {
    switch (entityType) {
      case 'permit': return 'Permit Application';
      case 'license': return 'Business License';
      case 'tax': return 'Tax Submission';
      case 'service': return 'Service Application';
      default: return 'Payment';
    }
  };

  const getEntityNumber = () => {
    return entityData?.permit_number || 
           entityData?.license_number || 
           entityData?.application_number || 
           'N/A';
  };

  const getPaymentMethodDisplay = () => {
    if (paymentResult?.payment_type === 'PAYMENT_CARD' && paymentResult?.card_brand && paymentResult?.card_last_four) {
      const brandName = paymentResult.card_brand.charAt(0).toUpperCase() + paymentResult.card_brand.slice(1).toLowerCase();
      return `${brandName} •••• ${paymentResult.card_last_four}`;
    }
    if (paymentResult?.payment_type === 'BANK_ACCOUNT' && paymentResult?.bank_last_four) {
      return `Bank •••• ${paymentResult.bank_last_four}`;
    }
    if (paymentResult?.payment_type === 'APPLE_PAY') {
      return 'Apple Pay';
    }
    if (paymentResult?.payment_type === 'GOOGLE_PAY') {
      return 'Google Pay';
    }
    return 'Payment Method';
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-green-800">Payment Successful!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your payment has been processed successfully
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">{getEntityLabel()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Number</span>
              <span className="text-sm font-medium">{getEntityNumber()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="text-sm font-medium">{getPaymentMethodDisplay()}</span>
            </div>
          </div>
          
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Amount</span>
              <span className="text-sm">{formatCurrency(baseAmount)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm">Service Fee</span>
              <span className="text-sm">{formatCurrency((serviceFee?.totalFee || 0) / 100)}</span>
            </div>
            
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Paid</span>
              <span className="text-green-600">{formatCurrency(totalWithFee)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">TxnID</span>
            <span className="text-sm font-medium font-mono">
              {paymentResult?.transfer_id || 'N/A'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="text-sm font-medium text-green-600">Completed</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Processed At</span>
            <span className="text-sm font-medium">
              {new Date().toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full" 
          size="lg"
          onClick={onViewFullReceipt}
        >
          <Receipt className="h-4 w-4 mr-2" />
          View Full Receipt
        </Button>
        
        <Button 
          className="w-full" 
          size="lg"
          onClick={onClose}
        >
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccessContent;