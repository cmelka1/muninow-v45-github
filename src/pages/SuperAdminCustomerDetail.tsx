import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Building2, User, CreditCard, Plus } from 'lucide-react';
import { useCustomerDetail } from '@/hooks/useCustomerDetail';
import { useCustomerPaymentMethods } from '@/hooks/useCustomerPaymentMethods';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const SuperAdminCustomerDetail = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, error } = useCustomerDetail(customerId!);
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useCustomerPaymentMethods(customerId!);

  const handleGoBack = () => {
    navigate('/superadmin/customers');
  };

  const getCustomerName = () => {
    if (!customer) return 'Loading...';
    return customer.business_name || customer.doing_business_as || 'Unknown Customer';
  };

  const formatAddress = () => {
    if (!customer) return '';
    const parts = [
      customer.business_address_line1,
      customer.business_address_line2,
      customer.business_address_city,
      customer.business_address_state,
      customer.business_address_zip_code,
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (error) {
    return (
      <SuperAdminLayout>
        <div className="p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h1>
            <p className="text-gray-600 mb-6">
              The customer you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="p-8">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/superadmin/dashboard">SuperAdmin Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/superadmin/customers">Customers</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{getCustomerName()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {getCustomerName()}
            </h1>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </div>

        {/* Three Tiles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tile 1: Entity Profile */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-medium">
                <Building2 className="h-5 w-5 mr-2" />
                Entity Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Name</label>
                    <p className="text-sm text-gray-900 mt-1">{customer?.business_name || 'N/A'}</p>
                  </div>
                  
                  {customer?.doing_business_as && customer.doing_business_as !== customer.business_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">DBA</label>
                      <p className="text-sm text-gray-900 mt-1">{customer.doing_business_as}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Address</label>
                    <p className="text-sm text-gray-900 mt-1">{formatAddress() || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Website</label>
                    <p className="text-sm text-gray-900 mt-1">{customer?.business_website || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Type</label>
                    <p className="text-sm text-gray-900 mt-1">{customer?.business_type || 'N/A'}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tile 2: Contact Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-medium">
                <User className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner Name</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {customer?.owner_first_name && customer?.owner_last_name
                        ? `${customer.owner_first_name} ${customer.owner_last_name}`
                        : 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Job Title</label>
                    <p className="text-sm text-gray-900 mt-1">{customer?.owner_job_title || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Work Email</label>
                    <p className="text-sm text-gray-900 mt-1">{customer?.owner_work_email || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Personal Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{customer?.owner_personal_phone || 'N/A'}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tile 3: Merchant Accounts */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg font-medium">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Methods
                </CardTitle>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/superadmin/customers/${customerId}/add-merchant-account`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Payment Method
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPaymentMethods ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-3/4 mx-auto" />
                          <Skeleton className="h-4 w-1/2 mx-auto" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paymentMethods && paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{method.instrument_type === 'BANK_ACCOUNT' ? 'Bank Account' : method.instrument_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {method.account_type} • {method.masked_account_number}
                            </p>
                            {method.account_nickname && (
                              <p className="text-xs text-muted-foreground italic">{method.account_nickname}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            method.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {method.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(method.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center">
                        <span className="text-muted-foreground">
                          No payment methods found. Click "Add New Payment Method" to get started.
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomerDetail;