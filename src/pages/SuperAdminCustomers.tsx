import React, { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import CustomerTable from '@/components/CustomerTable';
import { AddCustomerDialog } from '@/components/AddCustomerDialog';

const SuperAdminCustomers = () => {
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  const handleAddCustomer = () => {
    setAddCustomerOpen(true);
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
        <AddCustomerDialog 
          open={addCustomerOpen}
          onOpenChange={setAddCustomerOpen}
        />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomers;