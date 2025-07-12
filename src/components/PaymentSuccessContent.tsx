import React from 'react';
import { CheckCircle, X, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface PaymentSuccessContentProps {
  paymentResult: any;
  bill: any;
  serviceFee: any;
  selectedPaymentMethod: string | null;
  onClose: () => void;
  onViewFullReceipt: () => void;
}

const PaymentSuccessContent: React.FC<PaymentSuccessContentProps> = ({
  paymentResult,
  bill,
  serviceFee,
  selectedPaymentMethod,
  onClose,
  onViewFullReceipt
}) => {
  const baseAmount = bill?.total_amount_cents || 0;
  const totalWithFee = baseAmount + (serviceFee?.totalFee || 0);

  const getPaymentMethodDisplay = () => {
    if (paymentResult?.payment_type === 'card' && paymentResult?.card_brand && paymentResult?.card_last_four) {
      const brandName = paymentResult.card_brand.charAt(0).toUpperCase() + paymentResult.card_brand.slice(1).toLowerCase();
      return `${brandName} •••• ${paymentResult.card_last_four}`;
    }
    if (paymentResult?.payment_type === 'bank' && paymentResult?.bank_last_four) {
      return `Bank •••• ${paymentResult.bank_last_four}`;
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
              <span className="text-sm text-muted-foreground">Merchant</span>
              <span className="text-sm font-medium">{bill?.merchant_name || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Bill Number</span>
              <span className="text-sm font-medium">{bill?.external_bill_number || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <span className="text-sm font-medium">{formatDate(bill?.due_date)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="text-sm font-medium">{getPaymentMethodDisplay()}</span>
            </div>
          </div>
          
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Amount</span>
              <span className="text-sm">{formatCurrency(baseAmount / 100)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm">Service Fee</span>
              <span className="text-sm">{formatCurrency((serviceFee?.totalFee || 0) / 100)}</span>
            </div>
            
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Paid</span>
              <span className="text-green-600">{formatCurrency(totalWithFee / 100)}</span>
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
            <span className="text-sm text-muted-foreground">Transaction ID</span>
            <span className="text-sm font-medium font-mono">
              {paymentResult?.payment_history_id?.slice(-8) || 'N/A'}
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