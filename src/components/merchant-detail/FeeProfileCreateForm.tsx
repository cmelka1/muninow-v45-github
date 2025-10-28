import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface FeeProfileCreateFormProps {
  onSubmit: (data: FeeFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
  initialValues?: FeeFormData;
  isUpdate?: boolean;
}

const FeeProfileCreateForm: React.FC<FeeProfileCreateFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  initialValues,
  isUpdate = false,
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FeeFormData>({
    defaultValues: initialValues || {
      ach_basis_points: 150,
      ach_fixed_fee: 50,
      ach_basis_points_fee_limit: 2500,
      basis_points: 300,
      fixed_fee: 50,
      ach_credit_return_fixed_fee: 500,
      ach_debit_return_fixed_fee: 500,
      dispute_fixed_fee: 1500,
      dispute_inquiry_fixed_fee: 1500,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isUpdate ? 'Update Fee Profile' : 'Create Fee Profile'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Card Fees</h3>
              
              <div className="space-y-2">
                <Label htmlFor="basis_points">Basis Points</Label>
                <Input
                  id="basis_points"
                  type="text"
                  inputMode="numeric"
                  {...register('basis_points', { 
                    required: 'Basis points is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Basis points (1/100th of a percent)</p>
                {errors.basis_points && (
                  <p className="text-sm text-destructive">{errors.basis_points.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixed_fee">Fixed Fee</Label>
                <Input
                  id="fixed_fee"
                  type="text"
                  inputMode="numeric"
                  {...register('fixed_fee', { 
                    required: 'Fixed fee is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Fixed fee in cents</p>
                {errors.fixed_fee && (
                  <p className="text-sm text-destructive">{errors.fixed_fee.message}</p>
                )}
              </div>
            </div>

            {/* ACH Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">ACH Fees</h3>
              
              <div className="space-y-2">
                <Label htmlFor="ach_basis_points">ACH Basis Points</Label>
                <Input
                  id="ach_basis_points"
                  type="text"
                  inputMode="numeric"
                  {...register('ach_basis_points', { 
                    required: 'ACH basis points is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Basis points (1/100th of a percent)</p>
                {errors.ach_basis_points && (
                  <p className="text-sm text-destructive">{errors.ach_basis_points.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ach_fixed_fee">ACH Fixed Fee</Label>
                <Input
                  id="ach_fixed_fee"
                  type="text"
                  inputMode="numeric"
                  {...register('ach_fixed_fee', { 
                    required: 'ACH fixed fee is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Fixed fee in cents</p>
                {errors.ach_fixed_fee && (
                  <p className="text-sm text-destructive">{errors.ach_fixed_fee.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ach_basis_points_fee_limit">ACH Basis Points Fee Limit</Label>
                <Input
                  id="ach_basis_points_fee_limit"
                  type="text"
                  inputMode="numeric"
                  {...register('ach_basis_points_fee_limit', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Maximum fee in cents (optional)</p>
                {errors.ach_basis_points_fee_limit && (
                  <p className="text-sm text-destructive">{errors.ach_basis_points_fee_limit.message}</p>
                )}
              </div>
            </div>

            {/* Return Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Return Fees</h3>
              
              <div className="space-y-2">
                <Label htmlFor="ach_credit_return_fixed_fee">ACH Credit Return Fixed Fee</Label>
                <Input
                  id="ach_credit_return_fixed_fee"
                  type="text"
                  inputMode="numeric"
                  {...register('ach_credit_return_fixed_fee', { 
                    required: 'ACH credit return fee is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Fixed fee in cents</p>
                {errors.ach_credit_return_fixed_fee && (
                  <p className="text-sm text-destructive">{errors.ach_credit_return_fixed_fee.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ach_debit_return_fixed_fee">ACH Debit Return Fixed Fee</Label>
                <Input
                  id="ach_debit_return_fixed_fee"
                  type="text"
                  inputMode="numeric"
                  {...register('ach_debit_return_fixed_fee', { 
                    required: 'ACH debit return fee is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Fixed fee in cents</p>
                {errors.ach_debit_return_fixed_fee && (
                  <p className="text-sm text-destructive">{errors.ach_debit_return_fixed_fee.message}</p>
                )}
              </div>
            </div>

            {/* Dispute Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dispute Fees</h3>
              
              <div className="space-y-2">
                <Label htmlFor="dispute_fixed_fee">Dispute Fixed Fee</Label>
                <Input
                  id="dispute_fixed_fee"
                  type="text"
                  inputMode="numeric"
                  {...register('dispute_fixed_fee', { 
                    required: 'Dispute fixed fee is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Fixed fee in cents</p>
                {errors.dispute_fixed_fee && (
                  <p className="text-sm text-destructive">{errors.dispute_fixed_fee.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispute_inquiry_fixed_fee">Dispute Inquiry Fixed Fee</Label>
                <Input
                  id="dispute_inquiry_fixed_fee"
                  type="text"
                  inputMode="numeric"
                  {...register('dispute_inquiry_fixed_fee', { 
                    required: 'Dispute inquiry fixed fee is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Fixed fee in cents</p>
                {errors.dispute_inquiry_fixed_fee && (
                  <p className="text-sm text-destructive">{errors.dispute_inquiry_fixed_fee.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Next'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FeeProfileCreateForm;