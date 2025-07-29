import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import PaymentHistoryTable from '@/components/PaymentHistoryTable';
import PaymentHistoryFilter, { PaymentHistoryFilters } from '@/components/PaymentHistoryFilter';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [filters, setFilters] = useState<PaymentHistoryFilters>({});

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
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-gray-100">
          {/* Main Payment History Content */}
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Payment History
              </h1>
            </div>

            <PaymentHistoryFilter filters={filters} onFiltersChange={setFilters} />
            <PaymentHistoryTable filters={filters} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PaymentHistory;