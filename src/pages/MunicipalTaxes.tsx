import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TaxSubmissionsFilter, { TaxSubmissionFilters } from '@/components/TaxSubmissionsFilter';
import MunicipalTaxSubmissionsTable from '@/components/MunicipalTaxSubmissionsTable';

const MunicipalTaxes = () => {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<TaxSubmissionFilters>({});

  // Guard against non-municipal users
  if (profile && profile.account_type !== 'municipal') {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground mt-2">This page is only accessible to municipal users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tax Submissions
        </h1>
        <p className="text-gray-600">
          Review and manage tax submissions for your municipality
        </p>
      </div>

      <TaxSubmissionsFilter 
        filters={filters} 
        onFiltersChange={setFilters} 
        customerId={profile?.customer_id}
      />
      <MunicipalTaxSubmissionsTable 
        filters={filters} 
        title="Municipal Tax Submissions"
      />
    </div>
  );
};

export default MunicipalTaxes;