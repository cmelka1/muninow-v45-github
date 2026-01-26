import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Save, X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessLicensesMerchant } from '@/hooks/useBusinessLicensesMerchant';
import { useCustomerServiceConfig } from '@/hooks/useCustomerServiceConfig';
import { useMerchantById } from '@/hooks/useMerchantById';
import { 
  useBusinessLicenseTypes, 
  useCreateBusinessLicenseType, 
  useUpdateBusinessLicenseType, 
  useDeleteBusinessLicenseType,
  type BusinessLicenseType
} from '@/hooks/useBusinessLicenseTypes';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface EditableFieldProps {
  value: string | number;
  onChange: (value: any) => void;
  type: 'text' | 'number';
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
        {`${prefix || ''}${value || placeholder}`}
      </span>
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

interface NewBusinessLicenseTypeRowProps {
  onAdd: (licenseType: { name: string; fee_cents: number }) => void;
  isLoading: boolean;
}

const NewBusinessLicenseTypeRow: React.FC<NewBusinessLicenseTypeRowProps> = ({ onAdd, isLoading }) => {
  const [name, setName] = useState('');
  const [feeCents, setFeeCents] = useState(0);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Please enter a license type name');
      return;
    }
    
    onAdd({
      name: name.trim(),
      fee_cents: Math.round(feeCents * 100),
    });

    // Reset form
    setName('');
    setFeeCents(0);
  };

  return (
    <TableRow className="bg-muted/10">
      <TableCell>
        <Input
          placeholder="Enter license type name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Input
            type="number"
            placeholder="0.00"
            value={feeCents}
            onChange={(e) => setFeeCents(parseFloat(e.target.value) || 0)}
            className="w-full text-right"
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

export const BusinessLicensesSettingsTab = () => {
  const { profile } = useAuth();
  
  // Get merchant from service config (primary) or subcategory lookup (fallback)
  const { data: serviceConfig, isLoading: isConfigLoading } = useCustomerServiceConfig(profile?.customer_id);
  const { data: subcategoryMerchant, isLoading: isSubcategoryLoading } = useBusinessLicensesMerchant(profile?.customer_id);
  const { data: municipalTypes = [], isLoading } = useBusinessLicenseTypes(profile?.customer_id);
  
  // Fetch configured merchant by ID (more efficient than fetching all)
  const { data: configuredMerchant, isLoading: isConfiguredMerchantLoading } = useMerchantById(
    serviceConfig?.business_licenses_merchant_id
  );
  
  // Determine which merchant to use: service config first, then subcategory lookup
  const businessLicensesMerchant = configuredMerchant 
    ? { id: configuredMerchant.id, merchant_name: configuredMerchant.merchant_name }
    : subcategoryMerchant;
  
  const isMerchantLoading = isConfigLoading || isSubcategoryLoading || isConfiguredMerchantLoading;
  
  const createMutation = useCreateBusinessLicenseType();
  const updateMutation = useUpdateBusinessLicenseType();
  const deleteMutation = useDeleteBusinessLicenseType();
  
  const hasMerchantConfigured = !!businessLicensesMerchant;
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const formatCurrencyValue = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleFieldChange = (licenseTypeId: string, field: string, value: any) => {
    setChanges(prev => ({
      ...prev,
      [`${licenseTypeId}::${field}`]: value
    }));
  };

  const getFieldValue = (licenseType: BusinessLicenseType, field: string, defaultValue: any) => {
    const changeKey = `${licenseType.id}::${field}`;
    if (changes[changeKey] !== undefined) {
      return changes[changeKey];
    }
    // For fee_cents, convert from cents to dollars for display
    if (field === 'fee_cents') {
      return defaultValue / 100;
    }
    return defaultValue;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(changes).reduce((acc, [key, value]) => {
        const [licenseTypeId, field] = key.split('::');
        if (!acc[licenseTypeId]) acc[licenseTypeId] = {};
        
        switch (field) {
          case 'name':
            acc[licenseTypeId].name = value;
            break;
          case 'fee_cents':
            acc[licenseTypeId].base_fee_cents = Math.round(value * 100);
            break;
        }
        return acc;
      }, {} as Record<string, any>);

      // Save all updates
      await Promise.all(
        Object.entries(updates).map(([licenseTypeId, updateData]) =>
          updateMutation.mutateAsync({
            id: licenseTypeId,
            updates: updateData,
          })
        )
      );

      setChanges({});
      setIsEditMode(false);
      toast.success('Business license types updated successfully');
    } catch (error) {
      toast.error('Failed to update business license types');
      console.error('Error updating business license types:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setChanges({});
    setIsEditMode(false);
  };

  const handleAddCustomType = async (licenseType: { name: string; fee_cents: number }) => {
    if (!profile?.customer_id) {
      toast.error('Customer profile not found. Please try refreshing the page.');
      return;
    }
    
    if (!businessLicensesMerchant) {
      toast.error('A payment merchant must be configured before adding license types. Please contact your administrator.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        customer_id: profile.customer_id,
        merchant_id: businessLicensesMerchant.id,
        merchant_name: businessLicensesMerchant.merchant_name,
        name: licenseType.name,
        base_fee_cents: licenseType.fee_cents,
        display_order: municipalTypes.length,
      });
      
      toast.success('Custom business license type added successfully');
    } catch (error) {
      toast.error('Failed to add custom business license type');
      console.error('Error adding custom business license type:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting business license type:', error);
    }
  };

  if (!profile?.customer_id) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading customer information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Business License Types</CardTitle>
            <CardDescription>
              Configure business license fees for your municipality.
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
            <p className="text-muted-foreground text-center py-8">
              Loading business license types...
            </p>
          ) : municipalTypes.length === 0 && !isEditMode ? (
            <p className="text-muted-foreground text-center py-8">
              No business license types configured yet. Click Edit to add your first license type.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business License Type</TableHead>
                    <TableHead>Fee</TableHead>
                    {!isEditMode && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {municipalTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">
                        <EditableField
                          value={getFieldValue(type, 'name', type.name)}
                          onChange={(value) => handleFieldChange(type.id, 'name', value)}
                          type="text"
                          placeholder={type.name}
                          isEditMode={isEditMode}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableField
                          value={getFieldValue(type, 'fee_cents', type.base_fee_cents)}
                          onChange={(value) => handleFieldChange(type.id, 'fee_cents', value)}
                          type="number"
                          prefix="$"
                          placeholder={formatCurrencyValue(type.base_fee_cents)}
                          isEditMode={isEditMode}
                          className="text-right"
                        />
                      </TableCell>
                      {!isEditMode && (
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deleteMutation.isPending}
                                className="hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Custom License Type</AlertDialogTitle>
                                <AlertDialogDescription className="space-y-3">
                                  <p>
                                    Are you sure you want to delete <strong>{type.name}</strong>?
                                  </p>
                                  <p className="text-destructive text-sm">
                                    This action cannot be undone. Applications using this license type may be affected.
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(type.id, type.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  
                  {isEditMode && hasMerchantConfigured && (
                    <NewBusinessLicenseTypeRow
                      onAdd={handleAddCustomType}
                      isLoading={createMutation.isPending}
                    />
                  )}
                  
                  {municipalTypes.length === 0 && isEditMode && !hasMerchantConfigured && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                        Configure a merchant below to add license types.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {isEditMode && !isMerchantLoading && !hasMerchantConfigured && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A payment merchant for Business Licenses must be configured before you can add custom license types.
                Please contact your platform administrator to set up the merchant account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};