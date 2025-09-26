import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Building } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface InlinePaymentSummaryProps {
  entityName: string;
  baseAmount: number; // in cents
  serviceFee?: number; // in cents
  totalAmount: number; // in cents
  paymentMethodType?: 'card' | 'ach' | 'google-pay' | 'apple-pay';
  selectedPaymentMethodName?: string;
  feeLabel?: string;
  className?: string;
}

export const InlinePaymentSummary: React.FC<InlinePaymentSummaryProps> = ({
  entityName,
  baseAmount,
  serviceFee = 0,
  totalAmount,
  paymentMethodType,
  selectedPaymentMethodName,
  feeLabel,
  className = ''
}) => {
  return (
    <div className={`bg-muted/30 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          {feeLabel || 'Permit Fee'}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Base Amount</span>
          <span className="font-medium">{formatCurrency(baseAmount)}</span>
        </div>
        
        {serviceFee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Service Fee</span>
            <span className="font-medium">{formatCurrency(serviceFee)}</span>
          </div>
        )}
        
        <Separator className="my-2" />
        
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-bold text-lg text-primary">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {selectedPaymentMethodName && (
        <>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Method</span>
            <div className="flex items-center gap-2">
              {paymentMethodType === 'ach' ? (
                <Building className="h-4 w-4 text-primary" />
              ) : (
                <CreditCard className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium">{selectedPaymentMethodName}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};