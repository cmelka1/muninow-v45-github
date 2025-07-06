import React from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { FinixSellerOnboardingForm } from '@/components/finix/FinixSellerOnboardingForm';

const SuperAdminFinixOnboarding = () => {
  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finix Seller Onboarding
          </h1>
          <p className="text-gray-600">
            Onboard new sellers for payment processing through Finix
          </p>
        </div>
        
        <FinixSellerOnboardingForm />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminFinixOnboarding;