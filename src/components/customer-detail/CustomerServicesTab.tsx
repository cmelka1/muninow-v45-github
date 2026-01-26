import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Wrench, FileText, Receipt, Calendar, Settings } from 'lucide-react';
import { 
  useCustomerServiceConfig, 
  useCreateCustomerServiceConfig, 
  useUpdateCustomerServiceConfig 
} from '@/hooks/useCustomerServiceConfig';
import { useMerchants } from '@/hooks/useMerchants';

interface CustomerServicesTabProps {
  customerId: string;
}

interface ServiceToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ServiceToggle: React.FC<ServiceToggleProps> = ({
  label,
  description,
  icon,
  checked,
  onCheckedChange,
  disabled = false,
}) => (
  <div className="flex items-center justify-between py-4 border-b last:border-b-0">
    <div className="flex items-center space-x-3">
      <div className="p-2 bg-primary/10 rounded-md text-primary">
        {icon}
      </div>
      <div>
        <Label className="text-base font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
  </div>
);

const CustomerServicesTab: React.FC<CustomerServicesTabProps> = ({ customerId }) => {
  const { data: config, isLoading: isConfigLoading } = useCustomerServiceConfig(customerId);
  const createMutation = useCreateCustomerServiceConfig();
  const updateMutation = useUpdateCustomerServiceConfig();
  const { merchants, fetchMerchantsByCustomer, isLoading: isMerchantsLoading } = useMerchants();

  const [localConfig, setLocalConfig] = React.useState({
    building_permits_enabled: true,
    business_licenses_enabled: true,
    taxes_enabled: true,
    sport_reservations_enabled: true,
    other_services_enabled: true,
    building_permits_merchant_id: null as string | null,
    business_licenses_merchant_id: null as string | null,
  });

  const [hasChanges, setHasChanges] = React.useState(false);

  // Load merchants for this customer
  useEffect(() => {
    if (customerId) {
      fetchMerchantsByCustomer(customerId, 1, 100);
    }
  }, [customerId]);

  // Initialize local config when data loads
  useEffect(() => {
    if (config) {
      setLocalConfig({
        building_permits_enabled: config.building_permits_enabled,
        business_licenses_enabled: config.business_licenses_enabled,
        taxes_enabled: config.taxes_enabled,
        sport_reservations_enabled: config.sport_reservations_enabled,
        other_services_enabled: config.other_services_enabled,
        building_permits_merchant_id: config.building_permits_merchant_id,
        business_licenses_merchant_id: config.business_licenses_merchant_id,
      });
    }
  }, [config]);

  // Create config if it doesn't exist
  useEffect(() => {
    if (!isConfigLoading && !config && customerId) {
      createMutation.mutate(customerId);
    }
  }, [isConfigLoading, config, customerId]);

  const handleToggleChange = (field: keyof typeof localConfig, value: boolean) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleMerchantChange = (field: 'building_permits_merchant_id' | 'business_licenses_merchant_id', value: string | null) => {
    setLocalConfig(prev => ({ ...prev, [field]: value === 'none' ? null : value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        customerId,
        updates: localConfig,
      });
      setHasChanges(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  if (isConfigLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading service configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Service Availability</CardTitle>
          <CardDescription>
            Enable or disable services for this municipality. Disabled services will not appear in the municipal portal sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceToggle
            label="Building Permits"
            description="Permit applications, inspections, and management"
            icon={<Wrench className="h-5 w-5" />}
            checked={localConfig.building_permits_enabled}
            onCheckedChange={(checked) => handleToggleChange('building_permits_enabled', checked)}
          />
          <ServiceToggle
            label="Business Licenses"
            description="Business license applications and renewals"
            icon={<FileText className="h-5 w-5" />}
            checked={localConfig.business_licenses_enabled}
            onCheckedChange={(checked) => handleToggleChange('business_licenses_enabled', checked)}
          />
          <ServiceToggle
            label="Taxes"
            description="Tax submissions and payment processing"
            icon={<Receipt className="h-5 w-5" />}
            checked={localConfig.taxes_enabled}
            onCheckedChange={(checked) => handleToggleChange('taxes_enabled', checked)}
          />
          <ServiceToggle
            label="Sport Reservations"
            description="Facility and field reservations"
            icon={<Calendar className="h-5 w-5" />}
            checked={localConfig.sport_reservations_enabled}
            onCheckedChange={(checked) => handleToggleChange('sport_reservations_enabled', checked)}
          />
          <ServiceToggle
            label="Other Services"
            description="Additional municipal services and payments"
            icon={<Settings className="h-5 w-5" />}
            checked={localConfig.other_services_enabled}
            onCheckedChange={(checked) => handleToggleChange('other_services_enabled', checked)}
          />
        </CardContent>
      </Card>

      {/* Merchant Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Assignments</CardTitle>
          <CardDescription>
            Assign merchants to handle payments for specific services. This determines which bank account receives payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Building Permits Merchant */}
          <div className="space-y-2">
            <Label className="text-base">Building Permits Merchant</Label>
            <Select
              value={localConfig.building_permits_merchant_id || 'none'}
              onValueChange={(value) => handleMerchantChange('building_permits_merchant_id', value)}
              disabled={!localConfig.building_permits_enabled || isMerchantsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a merchant..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No merchant assigned</SelectItem>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.merchant_name}
                    {merchant.subcategory && ` (${merchant.subcategory})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Merchant used for permit application fees and related payments.
            </p>
          </div>

          {/* Business Licenses Merchant */}
          <div className="space-y-2">
            <Label className="text-base">Business Licenses Merchant</Label>
            <Select
              value={localConfig.business_licenses_merchant_id || 'none'}
              onValueChange={(value) => handleMerchantChange('business_licenses_merchant_id', value)}
              disabled={!localConfig.business_licenses_enabled || isMerchantsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a merchant..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No merchant assigned</SelectItem>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.merchant_name}
                    {merchant.subcategory && ` (${merchant.subcategory})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Merchant used for business license fees and renewals.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CustomerServicesTab;
