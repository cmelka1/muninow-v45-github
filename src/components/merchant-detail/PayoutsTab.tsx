import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Merchant {
  id: string;
  merchant_name: string;
}

interface PayoutsTabProps {
  merchant: Merchant;
}

const PayoutsTab: React.FC<PayoutsTabProps> = ({ merchant }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payouts</CardTitle>
      </CardHeader>
      <CardContent className="py-8">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">Coming Soon</p>
          <p>Payout management for {merchant.merchant_name} will be available here.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutsTab;