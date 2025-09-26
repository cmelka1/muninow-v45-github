import React from 'react';
import { formatCurrency } from '@/lib/formatters';
import { useServiceFeeCalculation } from '@/hooks/useServiceFeeCalculation';

interface PermitPaymentSummaryProps {
  baseAmount: number; // in cents
  selectedPaymentMethod: string | null;
  compact?: boolean;
}

const PermitPaymentSummary: React.FC<PermitPaymentSummaryProps> = ({
  baseAmount,
  selectedPaymentMethod,
  compact = false
}) => {
  const feeCalculation = useServiceFeeCalculation(baseAmount, selectedPaymentMethod);
  
  const baseAmountFormatted = formatCurrency(baseAmount / 100);
  const serviceFeeFormatted = formatCurrency(feeCalculation.serviceFee / 100);
  const totalAmountFormatted = formatCurrency(feeCalculation.totalAmount / 100);

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
            {feeCalculation.isLoading ? "Calculating..." : 
             selectedPaymentMethod ? serviceFeeFormatted : "Select payment method"}
          </span>
        </div>
        
        <div className="border-t border-border pt-2">
        <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-bold">
              {feeCalculation.isLoading ? "Calculating..." : totalAmountFormatted}
            </span>
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
          {feeCalculation.isLoading ? "Calculating..." : 
           selectedPaymentMethod ? serviceFeeFormatted : "Select payment method"}
        </span>
      </div>
      
      <div className="border-t border-border my-2"></div>
      
      <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
        <span className="text-base font-semibold">Total Amount Due</span>
        <span className="text-lg font-bold">
          {feeCalculation.isLoading ? "Calculating..." : totalAmountFormatted}
        </span>
      </div>
    </div>
  );
};

export default PermitPaymentSummary;