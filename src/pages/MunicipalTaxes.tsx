import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import TaxSubmissionsFilter, { TaxSubmissionFilters } from '@/components/TaxSubmissionsFilter';
import MunicipalTaxSubmissionsTable from '@/components/MunicipalTaxSubmissionsTable';

const MunicipalTaxes = () => {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<TaxSubmissionFilters>({});

  // Guard against non-municipal users
  const isMunicipal = profile?.account_type && (profile.account_type === 'municipal' || profile.account_type.startsWith('municipal'));
  if (profile && !isMunicipal) {
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
    <>
      <Helmet>
        <title>Taxes | MuniNow</title>
      </Helmet>
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
    </>
  );
};

export default MunicipalTaxes;