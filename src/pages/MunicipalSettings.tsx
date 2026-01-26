import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { PermitsSettingsTab } from '@/components/settings/PermitsSettingsTab';
import { BusinessLicensesSettingsTab } from '@/components/settings/BusinessLicensesSettingsTab';
import { TaxesSettingsTab } from '@/components/settings/TaxesSettingsTab';
import { useCustomerServiceConfig, CustomerServiceConfig } from '@/hooks/useCustomerServiceConfig';
import { Loader2 } from 'lucide-react';

type ServiceConfigKey = 'building_permits_enabled' | 'business_licenses_enabled' | 'taxes_enabled';

interface SettingsTabConfig {
  id: string;
  label: string;
  serviceKey: ServiceConfigKey;
}

// Define tab configs outside component (static)
const TAB_CONFIGS: SettingsTabConfig[] = [
  { id: 'permits', label: 'Permits', serviceKey: 'building_permits_enabled' },
  { id: 'business-licenses', label: 'Business Licenses', serviceKey: 'business_licenses_enabled' },
  { id: 'taxes', label: 'Taxes', serviceKey: 'taxes_enabled' },
];

// Component map for rendering tab content
const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  'permits': PermitsSettingsTab,
  'business-licenses': BusinessLicensesSettingsTab,
  'taxes': TaxesSettingsTab,
};

const MunicipalSettings = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: serviceConfig, isLoading: isConfigLoading } = useCustomerServiceConfig(profile?.customer_id);

  // Filter tabs based on service config
  const enabledTabs = useMemo(() => {
    if (!serviceConfig) return TAB_CONFIGS; // Show all while loading for backwards compatibility
    return TAB_CONFIGS.filter(tab => serviceConfig[tab.serviceKey] === true);
  }, [serviceConfig]);

  // Get active tab, defaulting to first enabled tab
  const activeTab = searchParams.get('tab') || (enabledTabs[0]?.id || 'permits');

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate('/signin');
    }
  }, [user, isAuthLoading, navigate]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (isAuthLoading || isConfigLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If no tabs are enabled, show a message
  if (enabledTabs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
            Municipal Settings
          </h1>
          <p className="text-slate-600">
            No services are currently enabled for your municipality.
            Please contact your platform administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
          Municipal Settings
        </h1>
        <p className="text-slate-600">
          Configure settings for your municipal services and applications
        </p>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`grid w-full grid-cols-${enabledTabs.length} h-auto p-1 bg-white border border-slate-200 rounded-lg`}>
          {enabledTabs.map(tab => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id}
              className="text-sm font-medium py-3 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          {enabledTabs.map(tab => {
            const TabComponent = TAB_COMPONENTS[tab.id];
            return (
              <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                <TabComponent />
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
};

export default MunicipalSettings;