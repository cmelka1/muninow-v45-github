import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalTab } from '@/components/profile/PersonalTab';
import { VehiclesTab } from '@/components/profile/VehiclesTab';
import { PaymentMethodsTab } from '@/components/profile/PaymentMethodsTab';
import { SecurityTab } from '@/components/profile/SecurityTab';
import { NotificationsTab } from '@/components/profile/NotificationsTab';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'personal';

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate('/signin');
    }
  }, [user, isLoading, navigate]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-slate-50">
          <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                Profile Settings
              </h1>
              <p className="text-slate-600">
                Manage your account settings and preferences
              </p>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white border border-slate-200 rounded-lg">
                <TabsTrigger 
                  value="personal" 
                  className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Personal
                </TabsTrigger>
                <TabsTrigger 
                  value="vehicles" 
                  className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Vehicles
                </TabsTrigger>
                <TabsTrigger 
                  value="payment" 
                  className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Payment Methods
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Security
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Notifications
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="personal" className="space-y-6">
                  <PersonalTab />
                </TabsContent>

                <TabsContent value="vehicles" className="space-y-6">
                  <VehiclesTab />
                </TabsContent>

                <TabsContent value="payment" className="space-y-6">
                  <PaymentMethodsTab />
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                  <SecurityTab />
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                  <NotificationsTab />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Profile;