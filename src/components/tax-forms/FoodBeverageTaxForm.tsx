import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';

interface FoodBeverageTaxData {
  grossSales: string;
  deductions: string;
  taxableReceipts: string;
  tax: string;
  commission: string;
  totalDue: string;
}

interface FoodBeverageTaxFormProps {
  data: FoodBeverageTaxData;
  onChange: (data: FoodBeverageTaxData) => void;
  disabled?: boolean;
}

export const FoodBeverageTaxForm: React.FC<FoodBeverageTaxFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const handleInputChange = (field: keyof FoodBeverageTaxData, value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const newData = { ...data, [field]: numericValue };
    
    // Auto-calculate dependent fields
    const grossSales = parseFloat(newData.grossSales) || 0;
    const deductions = parseFloat(newData.deductions) || 0;
    
    // Line 3: Calculate taxable receipts: Gross Sales - Deductions
    const taxableReceipts = Math.max(0, grossSales - deductions);
    newData.taxableReceipts = taxableReceipts.toFixed(2);
    
    // Line 4: Calculate tax: Taxable Receipts × 0.02 (2%)
    const tax = taxableReceipts * 0.02;
    newData.tax = tax.toFixed(2);
    
    // Line 5: Calculate commission: Tax Amount × 0.01 (1% if paid on time)
    const commission = tax * 0.01;
    newData.commission = commission.toFixed(2);
    
    // Line 6: Calculate total due: Tax Amount - Commission
    const totalDue = tax - commission;
    newData.totalDue = totalDue.toFixed(2);
    
    onChange(newData);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Food & Beverage Tax Calculation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gross-sales" className="text-sm font-medium">
              Gross Sales ($)
            </Label>
            <Input
              id="gross-sales"
              type="text"
              placeholder="0.00"
              value={data.grossSales}
              onChange={(e) => handleInputChange('grossSales', e.target.value)}
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
              value={data.deductions}
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
              value={data.taxableReceipts}
              disabled
              className="mt-1 bg-muted"
            />
          </div>
          
          <div>
            <Label htmlFor="tax-amount" className="text-sm font-medium">
              Amount of Tax (2% of Taxable Receipts) ($)
            </Label>
            <Input
              id="tax-amount"
              type="text"
              value={data.tax}
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
              value={data.commission}
              disabled
              className="mt-1 bg-muted"
            />
          </div>
          
          <div>
            <Label htmlFor="total-due" className="text-sm font-medium">
              Total Payment Due ($)
            </Label>
            <Input
              id="total-due"
              type="text"
              value={data.totalDue}
              disabled
              className="mt-1 bg-muted font-semibold"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};