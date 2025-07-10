import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Merchant {
  id: string;
  merchant_name: string;
  finix_merchant_id: string;
  finix_merchant_profile_id: string;
}

interface FeeFormData {
  ach_basis_points: number;
  ach_basis_points_fee_limit?: number;
  ach_fixed_fee: number;
  basis_points: number;
  fixed_fee: number;
  ach_credit_return_fixed_fee: number;
  ach_debit_return_fixed_fee: number;
  dispute_fixed_fee: number;
  dispute_inquiry_fixed_fee: number;
}

interface FeeProfileConfirmFormProps {
  merchant: Merchant;
  formData: FeeFormData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isUpdate?: boolean;
}

const formatCurrency = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

const formatBasisPoints = (bp: number) => {
  return `${bp} bp (${(bp / 100).toFixed(2)}%)`;
};

const FeeProfileConfirmForm: React.FC<FeeProfileConfirmFormProps> = ({
  merchant,
  formData,
  onConfirm,
  onCancel,
  isLoading,
  isUpdate = false,
}) => {
  return (
    <div className="space-y-6">
      {/* Merchant Information */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Merchant Name</div>
              <div className="text-base font-medium">{merchant.merchant_name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Finix Merchant ID</div>
              <div className="text-base font-mono">{merchant.finix_merchant_id}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Finix Merchant Profile ID</div>
              <div className="text-base font-mono">{merchant.finix_merchant_profile_id}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Profile Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ACH Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">ACH Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ACH Basis Points:</span>
                  <span className="font-medium">{formatBasisPoints(formData.ach_basis_points)}</span>
                </div>
                {formData.ach_basis_points_fee_limit && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ACH Basis Points Fee Limit:</span>
                    <span className="font-medium">{formatCurrency(formData.ach_basis_points_fee_limit)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ACH Fixed Fee:</span>
                  <span className="font-medium">{formatCurrency(formData.ach_fixed_fee)}</span>
                </div>
              </div>
            </div>

            {/* Card Processing Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Card Processing Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Basis Points:</span>
                  <span className="font-medium">{formatBasisPoints(formData.basis_points)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fixed Fee:</span>
                  <span className="font-medium">{formatCurrency(formData.fixed_fee)}</span>
                </div>
              </div>
            </div>

            {/* Return Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Return Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ACH Credit Return:</span>
                  <span className="font-medium">{formatCurrency(formData.ach_credit_return_fixed_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ACH Debit Return:</span>
                  <span className="font-medium">{formatCurrency(formData.ach_debit_return_fixed_fee)}</span>
                </div>
              </div>
            </div>

            {/* Dispute Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dispute Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Dispute Fixed Fee:</span>
                  <span className="font-medium">{formatCurrency(formData.dispute_fixed_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Dispute Inquiry Fee:</span>
                  <span className="font-medium">{formatCurrency(formData.dispute_inquiry_fixed_fee)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Confirming...' : (isUpdate ? 'Update Fee Profile' : 'Confirm Fee Profile')}
        </Button>
      </div>
    </div>
  );
};

export default FeeProfileConfirmForm;