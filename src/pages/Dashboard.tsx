import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/SimpleAuthContext';
import ApplicationsTable from '@/components/ApplicationsTable';
import ApplicationsFilter, { ApplicationFilters } from '@/components/ApplicationsFilter';


const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [filters, setFilters] = useState<ApplicationFilters>({});

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    }
  }, [user, isLoading, navigate]);

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

  return (
    <SidebarProvider>
      <Helmet>
        <title>Dashboard | MuniNow</title>
      </Helmet>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          {/* Main Dashboard Content */}
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dashboard
              </h1>
            </div>

            <ApplicationsFilter filters={filters} onFiltersChange={setFilters} />
            <ApplicationsTable filters={filters} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
