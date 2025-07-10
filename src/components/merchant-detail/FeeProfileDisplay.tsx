import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FeeProfile {
  id: string;
  merchant_id: string;
  finix_fee_profile_id: string;
  ach_basis_points: number;
  ach_basis_points_fee_limit?: number;
  ach_fixed_fee: number;
  basis_points: number;
  fixed_fee: number;
  ach_credit_return_fixed_fee: number;
  ach_debit_return_fixed_fee: number;
  dispute_fixed_fee: number;
  dispute_inquiry_fixed_fee: number;
  sync_status: string;
  created_at: string;
}

interface FeeProfileDisplayProps {
  feeProfile: FeeProfile;
  onUpdate?: () => void;
}

const formatCurrency = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

const formatBasisPoints = (bp: number) => {
  return `${bp} bp (${(bp / 100).toFixed(2)}%)`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'synced':
      return 'default';
    case 'created':
      return 'secondary';
    case 'pending':
      return 'outline';
    default:
      return 'destructive';
  }
};

const FeeProfileDisplay: React.FC<FeeProfileDisplayProps> = ({ feeProfile, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fee Profile</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(feeProfile.sync_status)}>
                {feeProfile.sync_status.charAt(0).toUpperCase() + feeProfile.sync_status.slice(1)}
              </Badge>
              {onUpdate && (
                <Button onClick={onUpdate} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Update Fee Profile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Fee Profile ID</div>
              <div className="text-base font-mono">{feeProfile.finix_fee_profile_id}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-base">{new Date(feeProfile.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Details */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary">Card Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Basis Points:</span>
                  <span className="font-medium">{formatBasisPoints(feeProfile.basis_points)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Fixed Fee:</span>
                  <span className="font-medium">{formatCurrency(feeProfile.fixed_fee)}</span>
                </div>
              </div>
            </div>

            {/* ACH Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary">ACH Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">ACH Basis Points:</span>
                  <span className="font-medium">{formatBasisPoints(feeProfile.ach_basis_points)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">ACH Fixed Fee:</span>
                  <span className="font-medium">{formatCurrency(feeProfile.ach_fixed_fee)}</span>
                </div>
                {feeProfile.ach_basis_points_fee_limit && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">ACH Basis Points Fee Limit:</span>
                    <span className="font-medium">{formatCurrency(feeProfile.ach_basis_points_fee_limit)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Return Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary">Return Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">ACH Credit Return:</span>
                  <span className="font-medium">{formatCurrency(feeProfile.ach_credit_return_fixed_fee)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">ACH Debit Return:</span>
                  <span className="font-medium">{formatCurrency(feeProfile.ach_debit_return_fixed_fee)}</span>
                </div>
              </div>
            </div>

            {/* Dispute Fees */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary">Dispute Fees</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Dispute Fixed Fee:</span>
                  <span className="font-medium">{formatCurrency(feeProfile.dispute_fixed_fee)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Dispute Inquiry Fee:</span>
                  <span className="font-medium">{formatCurrency(feeProfile.dispute_inquiry_fixed_fee)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeProfileDisplay;