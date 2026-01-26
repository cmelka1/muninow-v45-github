import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit2, Save, X, Plus } from 'lucide-react';
import { usePermitTypes, useCreatePermitType, useUpdatePermitType } from '@/hooks/usePermitTypes';
import { useBuildingPermitsMerchant } from '@/hooks/useBuildingPermitsMerchant';
import { useCustomerServiceConfig } from '@/hooks/useCustomerServiceConfig';
import { useMerchantById } from '@/hooks/useMerchantById';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';
import { PermitQuestionsCard } from './PermitQuestionsCard';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditableFieldProps {
  value: string | number | boolean;
  onChange: (value: any) => void;
  type: 'text' | 'number' | 'boolean';
  placeholder?: string;
  prefix?: string;
  isEditMode: boolean;
  className?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  type,
  placeholder,
  prefix,
  isEditMode,
  className
}) => {
  if (!isEditMode) {
    return (
      <span className="text-sm">
        {type === 'boolean' ? (value ? 'Yes' : 'No') : `${prefix || ''}${value || placeholder}`}
      </span>
    );
  }

  if (type === 'boolean') {
    return (
      <Switch
        checked={value as boolean}
        onCheckedChange={onChange}
      />
    );
  }

  return (
    <Input
      type={type === 'number' ? 'number' : 'text'}
      value={String(value)}
      onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
      placeholder={placeholder}
      className={`w-full ${className || ''}`}
    />
  );
};

interface NewPermitTypeRowProps {
  onAdd: (permitType: { name: string; fee_cents: number; requires_inspection: boolean }) => void;
  isLoading: boolean;
}

const NewPermitTypeRow: React.FC<NewPermitTypeRowProps> = ({ onAdd, isLoading }) => {
  const [name, setName] = useState('');
  const [feeCents, setFeeCents] = useState(0);
  const [requiresInspection, setRequiresInspection] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Please enter a permit type name');
      return;
    }
    
    onAdd({
      name: name.trim(),
      fee_cents: Math.round(feeCents * 100),
      requires_inspection: requiresInspection,
    });

    // Reset form
    setName('');
    setFeeCents(0);
    setRequiresInspection(false);
  };

  return (
    <TableRow className="bg-muted/10">
      <TableCell>
        <Input
          placeholder="Enter permit type name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
      </TableCell>
      <TableCell className="text-center">
        <Input
          type="number"
          placeholder="0.00"
          value={feeCents}
          onChange={(e) => setFeeCents(parseFloat(e.target.value) || 0)}
          className="w-full text-right"
        />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center space-x-2">
          <Switch
            checked={requiresInspection}
            onCheckedChange={setRequiresInspection}
          />
          <Button
            onClick={handleAdd}
            disabled={isLoading || !name.trim()}
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const PermitsSettingsTab = () => {
  const { profile } = useAuth();
  const { data: permitTypes, isLoading } = usePermitTypes(profile?.customer_id);
  
  // Get merchant from service config (primary) or subcategory lookup (fallback)
  const { data: serviceConfig, isLoading: isConfigLoading } = useCustomerServiceConfig(profile?.customer_id);
  const { data: subcategoryMerchant, isLoading: isSubcategoryLoading } = useBuildingPermitsMerchant(profile?.customer_id);
  
  // Fetch configured merchant by ID (more efficient than fetching all)
  const { data: configuredMerchant, isLoading: isConfiguredMerchantLoading } = useMerchantById(
    serviceConfig?.building_permits_merchant_id
  );
  
  // Determine which merchant to use: service config first, then subcategory lookup
  const buildingPermitsMerchant = configuredMerchant 
    ? { id: configuredMerchant.id, merchant_name: configuredMerchant.merchant_name }
    : subcategoryMerchant;
  
  const isMerchantLoading = isConfigLoading || isSubcategoryLoading || isConfiguredMerchantLoading;
  
  const updateMutation = useUpdatePermitType();
  const createMutation = useCreatePermitType();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const hasMerchantConfigured = !!buildingPermitsMerchant;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleFieldChange = (permitTypeId: string, field: string, value: any) => {
    let processedValue = value;
    
    // Convert fee values to cents for consistent storage
    if (field === 'base_fee_cents') {
      processedValue = Math.round(value * 100);
    }
    
    setChanges(prev => ({
      ...prev,
      [`${permitTypeId}::${field}`]: processedValue
    }));
  };

  const getFieldValue = (permit: any, field: string) => {
    const changeKey = `${permit.id}::${field}`;
    if (changes[changeKey] !== undefined) {
      return changes[changeKey];
    }
    return permit[field];
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(changes).reduce((acc, [key, value]) => {
        const [permitTypeId, field] = key.split('::');
        if (!acc[permitTypeId]) acc[permitTypeId] = {};
        acc[permitTypeId][field] = value;
        return acc;
      }, {} as Record<string, any>);

      await Promise.all(
        Object.entries(updates).map(([permitTypeId, updateData]) =>
          updateMutation.mutateAsync({
            id: permitTypeId,
            updates: updateData,
          })
        )
      );

      setChanges({});
      setIsEditMode(false);
      toast.success('Permit types updated successfully');
    } catch (error) {
      toast.error('Failed to update permit types');
      console.error('Error updating permit types:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setChanges({});
    setIsEditMode(false);
  };

  const handleAddCustomType = async (permitType: { name: string; fee_cents: number; requires_inspection: boolean }) => {
    if (!buildingPermitsMerchant) {
      toast.error('A payment merchant must be configured before adding permit types. Please contact your administrator.');
      return;
    }
    
    try {
      await createMutation.mutateAsync({
        name: permitType.name,
        base_fee_cents: permitType.fee_cents,
        processing_days: 30,
        requires_inspection: permitType.requires_inspection,
        merchant_id: buildingPermitsMerchant.id,
        merchant_name: buildingPermitsMerchant.merchant_name,
      });
      
      toast.success('Permit type added successfully');
    } catch (error) {
      toast.error('Failed to add permit type');
      console.error('Error adding permit type:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Permit Types</CardTitle>
            <CardDescription>
              Configure permit fees and inspection requirements for your municipality.
              {isEditMode && ' Make changes and click Save to apply them.'}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditMode ? (
              <Button
                onClick={() => setIsEditMode(true)}
                variant="outline"
                size="sm"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  disabled={isSaving || Object.keys(changes).length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading permit types...</div>
            </div>
          ) : !permitTypes?.length ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                No permit types available.
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permit Type</TableHead>
                    <TableHead className="text-center">Fee</TableHead>
                    <TableHead className="text-center">Inspection Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permitTypes.map((permit) => (
                    <TableRow key={permit.id}>
                      <TableCell className="font-medium">
                        <span>{permit.name}</span>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <EditableField
                          value={getFieldValue(permit, 'base_fee_cents') / 100}
                          onChange={(value) => handleFieldChange(permit.id, 'base_fee_cents', value)}
                          type="number"
                          prefix="$"
                          placeholder={formatCurrency(permit.base_fee_cents)}
                          isEditMode={isEditMode}
                          className="text-right"
                        />
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <EditableField
                          value={getFieldValue(permit, 'requires_inspection')}
                          onChange={(value) => handleFieldChange(permit.id, 'requires_inspection', value)}
                          type="boolean"
                          isEditMode={isEditMode}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {isEditMode && hasMerchantConfigured && (
                    <NewPermitTypeRow
                      onAdd={handleAddCustomType}
                      isLoading={createMutation.isPending}
                    />
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {isEditMode && !isMerchantLoading && !hasMerchantConfigured && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A payment merchant for Building Permits must be configured before you can add custom permit types.
                Please contact your platform administrator to set up the merchant account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <PermitQuestionsCard />
    </div>
  );
};