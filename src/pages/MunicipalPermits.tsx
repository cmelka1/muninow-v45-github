import React, { useState } from 'react';
import PermitsFilter, { PermitFilters } from '@/components/PermitsFilter';
import PermitsTable from '@/components/PermitsTable';

const MunicipalPermits = () => {
  const [filters, setFilters] = useState<PermitFilters>({});

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Permits
        </h1>
        <p className="text-gray-600">
          Manage and review permit applications for your municipality
        </p>
      </div>

      <PermitsFilter filters={filters} onFiltersChange={setFilters} />
      <PermitsTable 
        filters={filters} 
        onViewClick={(permitId) => {
          window.location.href = `/municipal/permit/${permitId}`;
        }}
      />
    </div>
  );
};

export default MunicipalPermits;