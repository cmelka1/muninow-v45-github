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
import { usePermitTypesWithCustomizations, useUpsertMunicipalPermitType, useCreateMunicipalPermitType, useMunicipalPermitTypes } from '@/hooks/useMunicipalPermitTypes';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';
import { PermitQuestionsCard } from './PermitQuestionsCard';

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
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Enter permit type name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
          <Badge variant="outline" className="text-xs shrink-0">
            Custom
          </Badge>
        </div>
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
  const { data: standardPermitTypes, isLoading: isLoadingStandard } = usePermitTypesWithCustomizations();
  const { data: customPermitTypes, isLoading: isLoadingCustom } = useMunicipalPermitTypes();
  const upsertMutation = useUpsertMunicipalPermitType();
  const createMutation = useCreateMunicipalPermitType();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = isLoadingStandard || isLoadingCustom;

  // Combine standard and custom permit types
  const allPermitTypes = [
    ...(standardPermitTypes || []),
    ...(customPermitTypes?.filter(ct => ct.is_custom) || []).map(ct => ({
      permit_type_id: ct.id,
      permit_type_name: ct.municipal_label,
      standard_fee_cents: ct.base_fee_cents,
      standard_processing_days: ct.processing_days,
      standard_requires_inspection: ct.requires_inspection,
      is_customized: false,
      is_custom: true,
    }))
  ];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleFieldChange = (permitTypeId: string, field: string, value: any) => {
    let processedValue = value;
    
    // Convert fee values to cents for consistent storage
    if (field === 'fee_cents') {
      processedValue = Math.round(value * 100);
    }
    
    setChanges(prev => ({
      ...prev,
      [`${permitTypeId}::${field}`]: processedValue
    }));
  };

  const getFieldValue = (permit: any, field: string, defaultValue: any) => {
    const changeKey = `${permit.permit_type_id}::${field}`;
    if (changes[changeKey] !== undefined) {
      return changes[changeKey];
    }
    
    if (permit.is_custom) {
      return defaultValue;
    }
    
    const customValue = permit[`custom_${field}`];
    return customValue !== undefined && customValue !== null ? customValue : defaultValue;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(changes).reduce((acc, [key, value]) => {
        const [permitTypeId, field] = key.split('::');
        if (!acc[permitTypeId]) acc[permitTypeId] = {};
        
        switch (field) {
          case 'fee_cents':
            acc[permitTypeId].base_fee_cents = value; // Already in cents from handleFieldChange
            break;
          case 'requires_inspection':
            acc[permitTypeId].requires_inspection = value;
            break;
        }
        return acc;
      }, {} as Record<string, any>);

      // Save all updates
      await Promise.all(
        Object.entries(updates).map(([permitTypeId, updateData]) =>
          upsertMutation.mutateAsync({
            permitTypeId,
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
    try {
      await createMutation.mutateAsync({
        municipal_label: permitType.name,
        base_fee_cents: permitType.fee_cents,
        processing_days: 30, // Default processing days since column is hidden
        requires_inspection: permitType.requires_inspection,
        is_custom: true,
      });
      
      toast.success('Custom permit type added successfully');
    } catch (error) {
      toast.error('Failed to add custom permit type');
      console.error('Error adding custom permit type:', error);
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
          ) : !allPermitTypes?.length ? (
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
                  {allPermitTypes.map((permit) => {
                    const isCustomized = permit.is_customized;
                    const isCustom = permit.is_custom;
                    
                    return (
                      <TableRow key={permit.permit_type_id} className={isCustomized ? 'bg-muted/20' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{permit.permit_type_name}</span>
                            {isCustom && (
                              <Badge variant="default" className="text-xs">
                                Custom
                              </Badge>
                            )}
                            {isCustomized && !isCustom && (
                              <Badge variant="secondary" className="text-xs">
                                Customized
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <EditableField
                            value={getFieldValue(permit, 'fee_cents', permit.standard_fee_cents) / 100}
                            onChange={(value) => handleFieldChange(permit.permit_type_id, 'fee_cents', value)}
                            type="number"
                            prefix="$"
                            placeholder={formatCurrency(permit.standard_fee_cents)}
                            isEditMode={isEditMode}
                            className="text-right"
                          />
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <EditableField
                            value={getFieldValue(permit, 'requires_inspection', permit.standard_requires_inspection)}
                            onChange={(value) => handleFieldChange(permit.permit_type_id, 'requires_inspection', value)}
                            type="boolean"
                            isEditMode={isEditMode}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {isEditMode && (
                    <NewPermitTypeRow
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
      
      <PermitQuestionsCard />
    </div>
  );
};