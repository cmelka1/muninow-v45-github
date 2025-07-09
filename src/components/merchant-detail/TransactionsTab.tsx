import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Merchant {
  id: string;
  merchant_name: string;
}

interface TransactionsTabProps {
  merchant: Merchant;
}

const TransactionsTab: React.FC<TransactionsTabProps> = ({ merchant }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent className="py-8">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">Coming Soon</p>
          <p>Transaction management for {merchant.merchant_name} will be available here.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsTab;