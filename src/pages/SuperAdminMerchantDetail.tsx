import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useMerchants } from '@/hooks/useMerchants';
import { useCustomers } from '@/hooks/useCustomers';
import { ArrowLeft } from 'lucide-react';
import MerchantProfileTab from '@/components/merchant-detail/MerchantProfileTab';
import TransactionsTab from '@/components/merchant-detail/TransactionsTab';
import PayoutsTab from '@/components/merchant-detail/PayoutsTab';
import PaymentDevicesTab from '@/components/merchant-detail/PaymentDevicesTab';
import FeesTab from '@/components/merchant-detail/FeesTab';

interface Merchant {
  id: string;
  merchant_name: string;
  business_name: string;
  verification_status: string;
  processing_status: string;
  created_at: string;
  business_address_line1: string;
  business_address_line2?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_country: string;
  finix_merchant_id: string | null;
  onboarding_state: string | null;
  processing_enabled: boolean | null;
  settlement_enabled: boolean | null;
  bank_account_holder_name: string | null;
  bank_masked_account_number: string | null;
  bank_routing_number: string | null;
}

interface Customer {
  customer_id: string;
  legal_entity_name: string;
}

const SuperAdminMerchantDetail = () => {
  const { customerId, merchantId } = useParams<{ customerId: string; merchantId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchMerchantById, isLoading: merchantLoading, error: merchantError } = useMerchants();
  const { fetchCustomerById, isLoading: customerLoading } = useCustomers();
  const [merchant, setMerchant] = useState<any>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const activeTab = searchParams.get('tab') || 'profile';

  useEffect(() => {
    const loadData = async () => {
      if (customerId && merchantId) {
        const [merchantData, customerData] = await Promise.all([
          fetchMerchantById(merchantId),
          fetchCustomerById(customerId)
        ]);
        setMerchant(merchantData);
        setCustomer(customerData);
      }
    };
    loadData();
  }, [customerId, merchantId]);

  const handleBack = () => {
    navigate(`/superadmin/customers/${customerId}?tab=merchants`);
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const isLoading = merchantLoading || customerLoading;
  const error = merchantError;

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="p-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customer
            </Button>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (error || !merchant || !customer) {
    return (
      <SuperAdminLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customer
          </Button>
          <Card>
            <CardContent className="py-8">
              <p className="text-destructive text-center">
                {error || 'Merchant not found'}
              </p>
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {customer.legal_entity_name}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {merchant.merchant_name}
          </h1>
          <p className="text-gray-600">
            {customer.legal_entity_name} • Merchant Details
          </p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white border border-slate-200 rounded-lg">
            <TabsTrigger 
              value="profile" 
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Merchant Profile
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger 
              value="payouts" 
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Payouts
            </TabsTrigger>
            <TabsTrigger 
              value="fees" 
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Fees
            </TabsTrigger>
            <TabsTrigger 
              value="payment-devices" 
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Payment Devices
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="profile" className="space-y-6">
              <MerchantProfileTab merchant={merchant} />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <TransactionsTab merchant={merchant} />
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              <PayoutsTab merchant={merchant} />
            </TabsContent>

            <TabsContent value="fees" className="space-y-6">
              <FeesTab merchant={merchant} />
            </TabsContent>

            <TabsContent value="payment-devices" className="space-y-6">
              <PaymentDevicesTab merchant={merchant} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminMerchantDetail;