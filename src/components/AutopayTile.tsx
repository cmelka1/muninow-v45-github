import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useBills } from '@/hooks/useBills';

const AutopayTile: React.FC = () => {
  const { data: billsData, isLoading, error } = useBills({ pageSize: 1000 }); // Get all bills to extract unique merchants
  
  // Extract unique merchants from bills
  const uniqueMerchants = React.useMemo(() => {
    if (!billsData?.data) return [];
    
    const merchantSet = new Set<string>();
    billsData.data.forEach(bill => {
      if (bill.merchant_name && bill.merchant_name.trim()) {
        merchantSet.add(bill.merchant_name.trim());
      }
    });
    
    return Array.from(merchantSet).sort();
  }, [billsData?.data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autopay Settings</CardTitle>
          <CardDescription>Manage automatic payments for your merchants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autopay Settings</CardTitle>
          <CardDescription>Manage automatic payments for your merchants</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load merchant data.</p>
        </CardContent>
      </Card>
    );
  }

  if (uniqueMerchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autopay Settings</CardTitle>
          <CardDescription>Manage automatic payments for your merchants</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No merchants found with outstanding bills.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autopay Settings</CardTitle>
        <CardDescription>Manage automatic payments for your merchants</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {uniqueMerchants.map((merchant) => (
            <div key={merchant} className="flex items-center justify-between py-1">
              <span className="font-medium text-sm">{merchant}</span>
              <Switch disabled className="opacity-50" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AutopayTile;