import React from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinixSellerForm } from '@/components/forms/FinixSellerForm';
import { useFinixSeller } from '@/hooks/useFinixSeller';

const SuperAdminCustomers = () => {
  const { submitSellerIdentity, isSubmitting } = useFinixSeller();

  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Finix Seller Onboarding
          </h1>
          <p className="text-muted-foreground">
            Create comprehensive seller identity for Finix payment processing
          </p>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Create Finix Seller Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <FinixSellerForm 
              onSubmit={submitSellerIdentity} 
              isSubmitting={isSubmitting} 
            />
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomers;