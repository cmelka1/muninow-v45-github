import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCustomers } from '@/hooks/useCustomers';
import { ArrowLeft } from 'lucide-react';
import CustomerInformationTab from '@/components/customer-detail/CustomerInformationTab';
import MerchantTab from '@/components/customer-detail/MerchantTab';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  entity_type: string;
  ownership_type: string;
  tax_id: string;
  entity_phone: string;
  entity_website: string;
  entity_description: string;
  business_address_line1: string;
  business_address_line2?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_country: string;
  incorporation_date?: any;
  created_at: string;
  status: string;
  first_name: string;
  last_name: string;
  work_email: string;
}

const SuperAdminCustomerDetail = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchCustomerById, isLoading, error } = useCustomers();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const activeTab = searchParams.get('tab') || 'customer-info';

  useEffect(() => {
    const loadCustomer = async () => {
      if (customerId) {
        const customerData = await fetchCustomerById(customerId);
        setCustomer(customerData);
      }
    };
    loadCustomer();
  }, [customerId]);

  const handleBack = () => {
    navigate('/superadmin/customers');
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };


  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="p-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
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
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
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

  if (error || !customer) {
    return (
      <SuperAdminLayout>
        <div className="p-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <Card>
            <CardContent className="py-8">
              <p className="text-destructive text-center">
                {error || 'Customer not found'}
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
            Back to Customers
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {customer.legal_entity_name}
          </h1>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-white border border-slate-200 rounded-lg">
            <TabsTrigger 
              value="customer-info" 
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Customer Information
            </TabsTrigger>
            <TabsTrigger 
              value="merchants" 
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Merchants
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="customer-info" className="space-y-6">
              <CustomerInformationTab customer={customer} />
            </TabsContent>

            <TabsContent value="merchants" className="space-y-6">
              <MerchantTab customer={customer} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomerDetail;