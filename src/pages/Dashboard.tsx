import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import BillsTable from '@/components/BillsTable';
import BillsFilter, { BillFilters } from '@/components/BillsFilter';
import PaymentSidePanel from '@/components/PaymentSidePanel';
import AutopayTile from '@/components/AutopayTile';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const [filters, setFilters] = useState<BillFilters>({});
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [isPaymentPanelOpen, setIsPaymentPanelOpen] = useState(false);

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
          {/* Main Dashboard Content */}
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dashboard
              </h1>
            </div>

            {/* Autopay Tile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AutopayTile />
              <div className="hidden lg:block" /> {/* Placeholder for future content */}
            </div>

            <BillsFilter filters={filters} onFiltersChange={setFilters} />
            <BillsTable 
              filters={filters} 
              onPayClick={(billId) => {
                setSelectedBillId(billId);
                setIsPaymentPanelOpen(true);
              }}
            />
          </div>
        </SidebarInset>
      </div>
      
      <PaymentSidePanel
        open={isPaymentPanelOpen}
        onOpenChange={setIsPaymentPanelOpen}
        billId={selectedBillId}
      />
    </SidebarProvider>
  );
};

export default Dashboard;
