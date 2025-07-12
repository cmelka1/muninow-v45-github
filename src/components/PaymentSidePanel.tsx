import React from 'react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useBill } from '@/hooks/useBill';
import { useNavigate } from 'react-router-dom';

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
import { X, CreditCard } from 'lucide-react';

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
  const { data: bill, isLoading: billLoading } = useBill(billId);

  // Calculate base amounts
  const baseAmount = bill?.total_amount_cents ? bill.total_amount_cents / 100 : 0;

  // Check if payment is available for this bill
  const isPaymentAvailable = bill?.finix_merchant_id && !billLoading;
  const paymentUnavailableReason = !bill?.finix_merchant_id ? 
    "Payment processing is not available for this bill. The merchant account may not be fully configured." : 
    null;

  const handlePayOnBillPage = () => {
    onOpenChange(false);
    navigate(`/bills/${billId}`);
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
        <SheetHeader>
          <SheetTitle>Bill Details</SheetTitle>
          <SheetDescription>
            View bill information for {bill.merchant_name || 'this bill'}
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
                <p className="text-sm text-muted-foreground">Due: {formatDate(bill.due_date)}</p>
                <p className="text-sm text-muted-foreground">Bill #: {bill.external_bill_number || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Amount Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-3xl font-bold">{formatCurrency(baseAmount)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Service fees will be calculated at checkout
                </p>
              </div>
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

          {/* Bill Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bill Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bill.issue_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Issue Date</span>
                  <span className="text-sm">{formatDate(bill.issue_date)}</span>
                </div>
              )}
              {bill.due_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className="text-sm">{formatDate(bill.due_date)}</span>
                </div>
              )}
              {bill.subcategory && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm">{bill.subcategory}</span>
                </div>
              )}
              {bill.external_account_number && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account</span>
                  <span className="text-sm">{bill.external_account_number}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Button */}
          {isPaymentAvailable ? (
            <Button 
              className="w-full" 
              size="lg"
              onClick={handlePayOnBillPage}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay on Bill Page
            </Button>
          ) : (
            <Button 
              className="w-full" 
              size="lg"
              variant="outline"
              onClick={handlePayOnBillPage}
            >
              View Full Bill Details
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Click the button above to access the full payment experience with all payment options
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentSidePanel;