import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';

interface HotelMotelTaxData {
  line1: string; // Total Monthly Receipts
  stateTax: string; // State Tax Deduction
  miscReceipts: string; // Misc Receipts Deduction
  monthsLate: string; // Months Late (0-12)
  creditsAttached: string; // Credits Attached
  // Calculated fields
  line2Total: string; // Total Deduction
  line3: string; // Net Receipts
  line4: string; // Municipal Tax
  line5: string; // Penalty
  line6: string; // Total Tax including Penalty
  line8: string; // Total Payment Due
}

interface HotelMotelTaxFormProps {
  data: HotelMotelTaxData;
  onChange: (data: HotelMotelTaxData) => void;
  disabled?: boolean;
}

export const HotelMotelTaxForm: React.FC<HotelMotelTaxFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const validateDecimalInput = (value: string) => {
    // Remove all non-numeric characters except decimal point
    let cleaned = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const decimalParts = cleaned.split('.');
    if (decimalParts.length > 2) {
      cleaned = decimalParts[0] + '.' + decimalParts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (decimalParts.length === 2 && decimalParts[1].length > 2) {
      cleaned = decimalParts[0] + '.' + decimalParts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const formatNumberWithCommas = (value: string) => {
    const number = parseFloat(value) || 0;
    return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleInputChange = (field: keyof HotelMotelTaxData, value: string) => {
    let processedValue = value;
    
    // Special handling for monthsLate - only allow integers 0-12
    if (field === 'monthsLate') {
      const intValue = value.replace(/[^0-9]/g, '');
      const numValue = parseInt(intValue) || 0;
      processedValue = Math.min(12, Math.max(0, numValue)).toString();
    } else {
      // For currency fields, use decimal validation
      processedValue = validateDecimalInput(value);
    }
    
    const newData = { ...data, [field]: processedValue };
    
    // Auto-calculate dependent fields based on new formula
    const line1 = parseFloat(newData.line1) || 0; // Total Monthly Receipts
    const stateTax = parseFloat(newData.stateTax) || 0; // State Tax Deduction
    const miscReceipts = parseFloat(newData.miscReceipts) || 0; // Misc Receipts Deduction
    const monthsLate = parseInt(newData.monthsLate) || 0; // Months Late
    const creditsAttached = parseFloat(newData.creditsAttached) || 0; // Credits Attached
    
    // Line 2: Total Deduction = stateTax + miscReceipts
    const line2Total = stateTax + miscReceipts;
    newData.line2Total = line2Total.toFixed(2);
    
    // Line 3: Net Receipts = line1 - line2Total
    const line3 = Math.max(0, line1 - line2Total);
    newData.line3 = line3.toFixed(2);
    
    // Line 4: Municipal Tax = 0.05 * (0.95 * line3)
    const line4 = 0.05 * (0.95 * line3);
    newData.line4 = line4.toFixed(2);
    
    // Line 5: Penalty = (monthsLate * 0.015) * line4
    const line5 = (monthsLate * 0.015) * line4;
    newData.line5 = line5.toFixed(2);
    
    // Line 6: Total Tax including Penalty = line4 + line5
    const line6 = line4 + line5;
    newData.line6 = line6.toFixed(2);
    
    // Line 8: Total Payment Due = line6 - creditsAttached
    const line8 = Math.max(0, line6 - creditsAttached);
    newData.line8 = line8.toFixed(2);
    
    onChange(newData);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Hotel & Motel Tax Calculation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground border-b pb-2">Input Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="line1" className="text-sm font-medium">
                Total Monthly Receipts ($)
              </Label>
              <Input
                id="line1"
                type="text"
                placeholder="0.00"
              value={data.line1 ? formatNumberWithCommas(data.line1) : ''}
              onChange={(e) => handleInputChange('line1', e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="stateTax" className="text-sm font-medium">
                State Tax Deduction ($)
              </Label>
              <Input
                id="stateTax"
                type="text"
                placeholder="0.00"
              value={data.stateTax ? formatNumberWithCommas(data.stateTax) : ''}
              onChange={(e) => handleInputChange('stateTax', e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="miscReceipts" className="text-sm font-medium">
                Misc Receipts Deduction ($)
              </Label>
              <Input
                id="miscReceipts"
                type="text"
                placeholder="0.00"
              value={data.miscReceipts ? formatNumberWithCommas(data.miscReceipts) : ''}
              onChange={(e) => handleInputChange('miscReceipts', e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="monthsLate" className="text-sm font-medium">
                Months Late (0-12)
              </Label>
              <Input
                id="monthsLate"
                type="text"
                placeholder="0"
                value={data.monthsLate}
                onChange={(e) => handleInputChange('monthsLate', e.target.value)}
                disabled={disabled}
                className="mt-1"
                maxLength={2}
              />
            </div>
            
            <div>
              <Label htmlFor="creditsAttached" className="text-sm font-medium">
                Credits Attached ($)
              </Label>
              <Input
                id="creditsAttached"
                type="text"
                placeholder="0.00"
              value={data.creditsAttached ? formatNumberWithCommas(data.creditsAttached) : ''}
              onChange={(e) => handleInputChange('creditsAttached', e.target.value)}
                disabled={disabled}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Calculations Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground border-b pb-2">Tax Calculation</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Total Monthly Receipts:</span>
              <span className="text-sm">{formatCurrency(parseFloat(data.line1) || 0)}</span>
            </div>
            
            <div className="pl-4 space-y-2 border-l-2 border-muted">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">A. State Tax:</span>
                <span className="text-sm">{formatCurrency(parseFloat(data.stateTax) || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">B. Misc Receipts:</span>
                <span className="text-sm">{formatCurrency(parseFloat(data.miscReceipts) || 0)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
              <span className="text-sm font-medium">Total Deduction:</span>
              <span className="text-sm font-medium">{formatCurrency(parseFloat(data.line2Total) || 0)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Net Receipts:</span>
              <span className="text-sm">{formatCurrency(parseFloat(data.line3) || 0)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Municipal Tax (5% of 95% of Net Receipts):</span>
              <span className="text-sm">{formatCurrency(parseFloat(data.line4) || 0)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">
                Penalty ({data.monthsLate || 0} months × 1.5% per month):
              </span>
              <span className="text-sm">{formatCurrency(parseFloat(data.line5) || 0)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
              <span className="text-sm font-medium">Total Tax including Penalty:</span>
              <span className="text-sm font-medium">{formatCurrency(parseFloat(data.line6) || 0)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Credits Attached:</span>
              <span className="text-sm">{formatCurrency(parseFloat(data.creditsAttached) || 0)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 bg-primary/10 px-3 rounded border-2 border-primary/20">
              <span className="text-base font-semibold text-primary">Total Payment Due:</span>
              <span className="text-base font-semibold text-primary">{formatCurrency(parseFloat(data.line8) || 0)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};