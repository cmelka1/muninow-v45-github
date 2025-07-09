import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Merchant {
  id: string;
  merchant_name: string;
  bank_account_holder_name: string | null;
  bank_masked_account_number: string | null;
  bank_routing_number: string | null;
}

interface PayoutsTabProps {
  merchant: Merchant;
}

const PayoutsTab: React.FC<PayoutsTabProps> = ({ merchant }) => {
  return (
    <div className="space-y-6">
      {/* Bank Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bank Account Name</label>
              <p className="mt-1 text-sm text-foreground">
                {merchant.bank_account_holder_name || 'Not Available'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bank Account Number</label>
              <p className="mt-1 text-sm text-foreground">
                {merchant.bank_masked_account_number || 'Not Available'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Routing Number</label>
              <p className="mt-1 text-sm text-foreground">
                {merchant.bank_routing_number || 'Not Available'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Profile</CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">Coming Soon</p>
            <p>Additional payout management features for {merchant.merchant_name} will be available here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutsTab;