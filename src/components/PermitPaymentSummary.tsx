import React from 'react';
import { formatCurrency } from '@/lib/formatters';

interface PermitPaymentSummaryProps {
  baseAmount: number; // in cents
  serviceFee: {
    totalFee: number;
    percentageFee: number;
    fixedFee: number;
    basisPoints: number;
    isCard: boolean;
    totalAmountToCharge: number;
    serviceFeeToDisplay: number;
  } | null;
  selectedPaymentMethod: string | null;
  compact?: boolean;
}

const PermitPaymentSummary: React.FC<PermitPaymentSummaryProps> = ({
  baseAmount,
  serviceFee,
  selectedPaymentMethod,
  compact = false
}) => {
  const baseAmountFormatted = formatCurrency(baseAmount / 100);
  const serviceFeeFormatted = serviceFee ? formatCurrency(serviceFee.serviceFeeToDisplay / 100) : formatCurrency(0);
  const totalAmount = serviceFee?.totalAmountToCharge || baseAmount;
  const totalAmountFormatted = formatCurrency(totalAmount / 100);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Permit Fee</span>
          <span className="text-sm font-medium">{baseAmountFormatted}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm">Service Fee</span>
          <span className="text-sm font-medium">
            {serviceFee ? serviceFeeFormatted : selectedPaymentMethod ? serviceFeeFormatted : "Select payment method"}
          </span>
        </div>
        
        <div className="border-t border-border pt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-bold">{totalAmountFormatted}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center py-2">
        <span className="text-base">Permit Fee</span>
        <span className="text-base font-medium">{baseAmountFormatted}</span>
      </div>
      
      <div className="flex justify-between items-center py-2">
        <span className="text-base">Service Fee</span>
        <span className="text-base font-medium text-right">
          {serviceFee ? (
            serviceFeeFormatted
          ) : selectedPaymentMethod ? (
            serviceFeeFormatted
          ) : (
            "Select payment method"
          )}
        </span>
      </div>
      
      <div className="border-t border-border my-2"></div>
      
      <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
        <span className="text-base font-semibold">Total Amount Due</span>
        <span className="text-lg font-bold">{totalAmountFormatted}</span>
      </div>
    </div>
  );
};

export default PermitPaymentSummary;