import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import PermitsFilter, { PermitFilters } from '@/components/PermitsFilter';
import PermitsTable from '@/components/PermitsTable';

const Permits = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [filters, setFilters] = useState<PermitFilters>({});

  // Redirect unauthenticated users or municipal users
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    } else if (!isLoading && profile && profile.account_type === 'municipal') {
      navigate('/municipal/permits');
    }
  }, [user, profile, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
        <title>Permits | MuniNow</title>
      </Helmet>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Permits
              </h1>
            </div>

            <PermitsFilter filters={filters} onFiltersChange={setFilters} />
            <PermitsTable 
              filters={filters} 
              onViewClick={(permitId) => {
                navigate(`/permit/${permitId}`);
              }}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Permits;