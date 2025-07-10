import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Merchant {
  id: string;
  merchant_name: string;
  finix_merchant_id: string;
  finix_merchant_profile_id: string;
}

interface LateFeesTabProps {
  merchant: Merchant;
}

const LateFeesTab: React.FC<LateFeesTabProps> = ({ merchant }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Late Fees Configuration</CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p>Late fees configuration will be implemented here.</p>
            <p className="text-sm mt-2">
              This section will manage late payment fees and penalty settings for {merchant.merchant_name}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LateFeesTab;