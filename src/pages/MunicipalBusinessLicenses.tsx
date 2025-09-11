import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BusinessLicenseFilter, { BusinessLicenseFilters } from '@/components/BusinessLicenseFilter';
import { MunicipalBusinessLicenseTable } from '@/components/MunicipalBusinessLicenseTable';

const MunicipalBusinessLicenses = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BusinessLicenseFilters>({ status: "issued" });

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
          navigate(`/municipal/business-license/${licenseId}`);
        }}
      />
    </div>
  );
};

export default MunicipalBusinessLicenses;