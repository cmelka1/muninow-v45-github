import React, { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import CustomerSearchBar from '@/components/CustomerSearchBar';
import CustomerTable from '@/components/CustomerTable';

const SuperAdminCustomers = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Customers
          </h1>
          <p className="text-gray-600">
            Search and manage customer accounts
          </p>
        </div>

        <CustomerSearchBar 
          onSearch={handleSearch}
          onClear={handleClear}
        />
        
        <CustomerTable searchQuery={searchQuery} />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomers;