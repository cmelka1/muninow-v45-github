import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BusinessLicenseFilter, { BusinessLicenseFilters } from '@/components/BusinessLicenseFilter';
import { MunicipalBusinessLicenseTable } from '@/components/MunicipalBusinessLicenseTable';

const MunicipalBusinessLicenses = () => {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<BusinessLicenseFilters>({});

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
          Business Licenses
        </h1>
        <p className="text-gray-600">
          Manage and review business license applications for your municipality
        </p>
      </div>

      <BusinessLicenseFilter filters={filters} onFiltersChange={setFilters} />
      <MunicipalBusinessLicenseTable 
        filters={filters} 
        onViewClick={(licenseId) => {
          window.location.href = `/business-licenses/${licenseId}`;
        }}
      />
    </div>
  );
};

export default MunicipalBusinessLicenses;