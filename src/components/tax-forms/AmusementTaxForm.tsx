import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';

interface AmusementTaxData {
  netReceipts: string;
  deductions: string;
  taxableReceipts: string;
  tax: string;
  commission: string;
  totalDue: string;
}

interface AmusementTaxFormProps {
  data: AmusementTaxData;
  onChange: (data: AmusementTaxData) => void;
  disabled?: boolean;
}

export const AmusementTaxForm: React.FC<AmusementTaxFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const validateDecimalInput = (value: string): string => {
    // Remove all non-digit and non-decimal characters
    let cleaned = value.replace(/[^\d.]/g, '');
    
    // Handle multiple decimal points - keep only the first one
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const formatNumberWithCommas = (value: string) => {
    const numericValue = validateDecimalInput(value);
    const number = parseFloat(numericValue) || 0;
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleInputChange = (field: keyof AmusementTaxData, value: string) => {
    const numericValue = validateDecimalInput(value);
    const newData = { ...data, [field]: numericValue };
    
    // Auto-calculate dependent fields
    const netReceipts = parseFloat(newData.netReceipts) || 0;
    const deductions = parseFloat(newData.deductions) || 0;
    
    // Line 3: Calculate taxable receipts: Net Receipts - Deductions
    const taxableReceipts = Math.max(0, netReceipts - deductions);
    newData.taxableReceipts = taxableReceipts.toFixed(2);
    
    // Line 4: Calculate tax: Taxable Receipts × 0.05 (5%)
    const tax = taxableReceipts * 0.05;
    newData.tax = tax.toFixed(2);
    
    // Line 5: Calculate commission: Tax × 0.01 (1% if paid on time)
    const commission = tax * 0.01;
    newData.commission = commission.toFixed(2);
    
    // Line 6: Calculate total due: Tax - Commission
    const totalDue = tax - commission;
    newData.totalDue = totalDue.toFixed(2);
    
    onChange(newData);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Amusement Tax Calculation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="net-receipts" className="text-sm font-medium">
              Net Receipts from Amusement Activities ($)
            </Label>
            <Input
              id="net-receipts"
              type="text"
              placeholder="0.00"
              value={data.netReceipts ? formatNumberWithCommas(data.netReceipts) : ''}
              onChange={(e) => handleInputChange('netReceipts', e.target.value)}
              disabled={disabled}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="deductions" className="text-sm font-medium">
              Deductions of Sales Not Subject to Tax ($)
            </Label>
            <Input
              id="deductions"
              type="text"
              placeholder="0.00"
              value={data.deductions ? formatNumberWithCommas(data.deductions) : ''}
              onChange={(e) => handleInputChange('deductions', e.target.value)}
              disabled={disabled}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="taxable-receipts" className="text-sm font-medium">
              Taxable Receipts ($)
            </Label>
            <Input
              id="taxable-receipts"
              type="text"
              value={formatCurrency(parseFloat(data.taxableReceipts) || 0)}
              disabled
              className="mt-1 bg-muted"
            />
          </div>
          
          <div>
            <Label htmlFor="tax-amount" className="text-sm font-medium">
              Amount of Tax (5% of Taxable Receipts) ($)
            </Label>
            <Input
              id="tax-amount"
              type="text"
              value={formatCurrency(parseFloat(data.tax) || 0)}
              disabled
              className="mt-1 bg-muted"
            />
          </div>
          
          <div>
            <Label htmlFor="commission" className="text-sm font-medium">
              Commission (1% of Tax Amount if Paid on Time) ($)
            </Label>
            <Input
              id="commission"
              type="text"
              value={formatCurrency(parseFloat(data.commission) || 0)}
              disabled
              className="mt-1 bg-muted"
            />
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="total-due" className="text-sm font-medium">
              Total Payment Due ($)
            </Label>
            <Input
              id="total-due"
              type="text"
              value={formatCurrency(parseFloat(data.totalDue) || 0)}
              disabled
              className="mt-1 bg-muted font-semibold"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};