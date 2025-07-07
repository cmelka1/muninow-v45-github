import React from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import CustomerTable from '@/components/CustomerTable';

const SuperAdminCustomers = () => {
  const handleAddCustomer = () => {
    // TODO: Implement add customer functionality
    console.log('Add customer clicked');
  };

  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Customers
          </h1>
          <p className="text-gray-600">
            Manage merchant accounts and payment processing
          </p>
        </div>

        <CustomerTable onAddCustomer={handleAddCustomer} />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomers;