import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import TaxSubmissionsFilter, { TaxSubmissionFilters } from '@/components/TaxSubmissionsFilter';
import TaxSubmissionsTable from '@/components/TaxSubmissionsTable';


const Taxes = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [filters, setFilters] = useState<TaxSubmissionFilters>({});
  // Redirect unauthenticated users or municipal users
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    } else if (!isLoading && profile && profile.account_type === 'municipal') {
      navigate('/municipal/dashboard');
    }
  }, [user, profile, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Guard against municipal users
  if (profile && profile.account_type === 'municipal') {
    return null; // Will redirect via useEffect
  }

  return (
    <SidebarProvider>
      <Helmet>
        <title>Taxes | MuniNow</title>
        <meta name="description" content="View and pay your taxes. Filter by status, due date, merchant, and amount." />
        <link rel="canonical" href={`${window.location.origin}/taxes`} />
      </Helmet>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-muted">
          <div className="p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Taxes</h1>
              <p className="text-muted-foreground">Manage and pay your tax bills</p>
            </header>

            <TaxSubmissionsFilter 
              filters={filters} 
              onFiltersChange={setFilters} 
              customerId={undefined} // Regular users don't have a specific customer_id filter
            />
            <TaxSubmissionsTable 
              filters={filters}
              title="Tax Submissions"
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Taxes;
