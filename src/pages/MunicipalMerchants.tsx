import React from 'react';
import { Helmet } from 'react-helmet-async';
import { MerchantsTable } from '@/components/MerchantsTable';

const MunicipalMerchants = () => {
  return (
    <>
      <Helmet>
        <title>Merchants | MuniNow</title>
      </Helmet>
      <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Merchants</h1>
          <p className="text-muted-foreground">
            Manage and view all merchants for your municipality
          </p>
        </div>
        <MerchantsTable />
      </div>
    </div>
    </>
  );
};

export default MunicipalMerchants;