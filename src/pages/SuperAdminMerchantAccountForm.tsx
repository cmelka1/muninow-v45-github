import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useCustomerDetail } from '@/hooks/useCustomerDetail';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import BankAccountStep from '@/components/merchant/BankAccountStep';
import { merchantAccountSchema, MerchantAccountFormData } from '@/schemas/merchantAccountSchema';

const SuperAdminMerchantAccountForm = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const { data: customer, isLoading, error } = useCustomerDetail(customerId!);

  const form = useForm<MerchantAccountFormData>({
    resolver: zodResolver(merchantAccountSchema),
    defaultValues: {
      bankAccount: {
        nameOnAccount: '',
        accountNickname: '',
        routingNumber: '',
        accountNumber: '',
        accountNumberConfirmation: '',
      },
    },
  });

  const handleGoBack = () => {
    navigate(`/superadmin/customers/${customerId}`);
  };

  const handleNextStep = async () => {
    const isValid = await form.trigger('bankAccount');
    if (isValid) {
      // For now, just show completion message since Step 2 is not implemented yet
      console.log('Bank Account Data:', form.getValues('bankAccount'));
      alert('Step 1 completed! Step 2 (Merchant Approval) will be implemented next.');
    }
  };

  const getCustomerName = () => {
    if (!customer) return 'Loading...';
    return customer.business_name || 'Unknown Customer';
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
              Back to Customer
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
                <BreadcrumbLink href={`/superadmin/customers/${customerId}`}>
                  {getCustomerName()}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Add Merchant Account</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Add Merchant Account
              </h1>
              <p className="text-gray-600 mt-1">
                Set up payment processing for {getCustomerName()}
              </p>
            </div>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customer
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <span className={`text-sm font-medium ${
                  currentStep === 1 ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  Bank Account Setup
                </span>
              </div>
              
              <div className="flex-1 mx-4 h-px bg-gray-200" />
              
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <span className={`text-sm font-medium ${
                  currentStep === 2 ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  Merchant Approval
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Form {...form}>
            <form className="space-y-6">
              {currentStep === 1 && (
                <BankAccountStep 
                  businessName={customer?.business_name || ''}
                  finixIdentityId={customer?.finix_identity_id || ''}
                />
              )}
              
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Merchant Approval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Step 2 (Merchant Approval) will be implemented next.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Form Actions */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={currentStep === 2}
                >
                  {currentStep === 1 ? (
                    <>
                      Next: Merchant Approval
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminMerchantAccountForm;