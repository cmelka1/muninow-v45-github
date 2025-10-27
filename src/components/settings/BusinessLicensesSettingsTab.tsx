import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
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
import { 
  useMunicipalBusinessLicenseTypes, 
  useCreateMunicipalBusinessLicenseType, 
  useUpdateMunicipalBusinessLicenseType, 
  useDeleteMunicipalBusinessLicenseType,
  useInitializeMunicipalBusinessLicenseTypes,
  type MunicipalBusinessLicenseType
} from '@/hooks/useMunicipalBusinessLicenseTypes';
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
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Enter license type name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
          <Badge variant="outline" className="text-xs shrink-0">
            Custom
          </Badge>
        </div>
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
  const { data: businessLicensesMerchant } = useBusinessLicensesMerchant(profile?.customer_id);
  const { data: municipalTypes = [], isLoading } = useMunicipalBusinessLicenseTypes(profile?.customer_id);
  
  const createMutation = useCreateMunicipalBusinessLicenseType();
  const updateMutation = useUpdateMunicipalBusinessLicenseType();
  const deleteMutation = useDeleteMunicipalBusinessLicenseType();
  const initializeMutation = useInitializeMunicipalBusinessLicenseTypes();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize standard types if none exist and prevent infinite retries
  useEffect(() => {
    if (profile?.customer_id && 
        municipalTypes.length === 0 && 
        !isLoading && 
        businessLicensesMerchant && 
        !initializeMutation.isPending &&
        !initializeMutation.isError) {
      initializeMutation.mutate(profile.customer_id);
    }
  }, [profile?.customer_id, municipalTypes.length, isLoading, businessLicensesMerchant, initializeMutation.isPending, initializeMutation.isError]);

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

  const getFieldValue = (licenseType: MunicipalBusinessLicenseType, field: string, defaultValue: any) => {
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
          case 'municipal_label':
            acc[licenseTypeId].municipal_label = value;
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
            data: updateData,
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
    if (!profile?.customer_id || !businessLicensesMerchant) return;

    try {
      await createMutation.mutateAsync({
        customer_id: profile.customer_id,
        merchant_id: businessLicensesMerchant.id,
        merchant_name: businessLicensesMerchant.merchant_name,
        municipal_label: licenseType.name,
        base_fee_cents: licenseType.fee_cents,
        is_custom: true,
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
          {isLoading || initializeMutation.isPending ? (
            <p className="text-muted-foreground text-center py-8">
              {initializeMutation.isPending 
                ? 'Initializing standard business license types...' 
                : 'Loading business license types...'
              }
            </p>
          ) : initializeMutation.isError ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">
                Failed to initialize business license types.
              </p>
              <Button 
                onClick={() => initializeMutation.mutate(profile?.customer_id!)} 
                variant="outline"
                disabled={!profile?.customer_id}
              >
                Retry Initialization
              </Button>
            </div>
          ) : municipalTypes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No business license types configured yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business License Type</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {municipalTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <EditableField
                            value={getFieldValue(type, 'municipal_label', type.municipal_label)}
                            onChange={(value) => handleFieldChange(type.id, 'municipal_label', value)}
                            type="text"
                            placeholder={type.municipal_label}
                            isEditMode={isEditMode}
                          />
                          {type.is_custom && (
                            <Badge variant="default" className="text-xs">
                              Custom
                            </Badge>
                          )}
                        </div>
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
                      <TableCell className="text-right">
                        {type.is_custom && !isEditMode && (
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
                                    Are you sure you want to delete <strong>{type.municipal_label}</strong>?
                                  </p>
                                  <p className="text-destructive text-sm">
                                    This action cannot be undone. Applications using this license type may be affected.
                                  </p>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(type.id, type.municipal_label)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {isEditMode && (
                    <NewBusinessLicenseTypeRow
                      onAdd={handleAddCustomType}
                      isLoading={createMutation.isPending}
                    />
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};