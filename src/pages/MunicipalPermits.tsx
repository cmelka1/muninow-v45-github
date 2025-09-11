import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PermitsFilter, { PermitFilters } from '@/components/PermitsFilter';
import MunicipalPermitsTable from '@/components/MunicipalPermitsTable';

const MunicipalPermits = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PermitFilters>({ status: "issued" });

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
          Building Permits
        </h1>
        <p className="text-gray-600">
          Manage and review building permit applications for your municipality
        </p>
      </div>

      <PermitsFilter filters={filters} onFiltersChange={setFilters} />
      <MunicipalPermitsTable 
        filters={filters} 
        onViewClick={(permitId) => {
          navigate(`/municipal/permit/${permitId}`);
        }}
      />
    </div>
  );
};

export default MunicipalPermits;