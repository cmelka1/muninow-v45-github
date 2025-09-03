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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RotateCcw } from 'lucide-react';
import { usePermitTypesWithCustomizations, useUpsertMunicipalPermitType, useDeleteMunicipalPermitType } from '@/hooks/useMunicipalPermitTypes';
import { useMerchants } from '@/hooks/useMerchants';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

interface InlineEditFieldProps {
  value: string | number | boolean;
  onSave: (value: any) => void;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  prefix?: string;
  isLoading?: boolean;
}

const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  type,
  options,
  placeholder,
  prefix,
  isLoading
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (type === 'boolean') {
    return (
      <div className="flex items-center space-x-2">
        <Switch
          checked={value as boolean}
          onCheckedChange={onSave}
          disabled={isLoading}
        />
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    );
  }

  if (type === 'select' && options) {
    return (
      <div className="flex items-center space-x-2">
        <Select value={value as string} onValueChange={onSave} disabled={isLoading}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div 
        className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
        onClick={() => setIsEditing(true)}
      >
        <span className="text-muted-foreground text-sm">
          {prefix}{value || placeholder}
        </span>
        {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Input
        type={type === 'number' ? 'number' : 'text'}
        value={String(editValue)}
        onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        autoFocus
        className="w-[200px]"
        disabled={isLoading}
      />
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
    </div>
  );
};

export const PermitsSettingsTab = () => {
  const { profile } = useAuth();
  const { data: permitTypes, isLoading } = usePermitTypesWithCustomizations();
  const { merchants, fetchMerchantsByCustomer } = useMerchants();
  const upsertMutation = useUpsertMunicipalPermitType();
  const deleteMutation = useDeleteMunicipalPermitType();
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (profile?.customer_id) {
      fetchMerchantsByCustomer(profile.customer_id);
    }
  }, [profile?.customer_id, fetchMerchantsByCustomer]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleFieldUpdate = async (
    permitTypeId: string,
    field: string,
    value: any
  ) => {
    const fieldKey = `${permitTypeId}-${field}`;
    setSavingFields(prev => new Set(prev).add(fieldKey));

    try {
      const updates: any = {};
      
      switch (field) {
        case 'municipal_label':
          updates.municipal_label = value;
          break;
        case 'base_fee_cents':
          updates.base_fee_cents = Math.round(value * 100);
          break;
        case 'processing_days':
          updates.processing_days = value;
          break;
        case 'requires_inspection':
          updates.requires_inspection = value;
          break;
        case 'merchant_id':
          updates.merchant_id = value;
          updates.merchant_name = merchants.find(m => m.id === value)?.merchant_name || null;
          break;
        case 'is_active':
          updates.is_active = value;
          break;
      }

      await upsertMutation.mutateAsync({
        permitTypeId,
        updates,
      });

      toast.success('Permit type updated successfully');
    } catch (error) {
      toast.error('Failed to update permit type');
      console.error('Error updating permit type:', error);
    } finally {
      setSavingFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldKey);
        return newSet;
      });
    }
  };

  const handleResetToStandard = async (permitTypeId: string) => {
    const permit = permitTypes?.find(p => p.permit_type_id === permitTypeId);
    if (!permit?.municipal_permit_type_id) return;

    try {
      await deleteMutation.mutateAsync(permit.municipal_permit_type_id);
      toast.success('Reset to standard settings');
    } catch (error) {
      toast.error('Failed to reset permit type');
      console.error('Error resetting permit type:', error);
    }
  };

  const merchantOptions = merchants.map(m => ({
    value: m.id,
    label: `${m.merchant_name} (${m.subcategory || 'General'})`
  }));

  const getFieldValue = (permit: any, field: string, defaultValue: any) => {
    const customValue = permit[`custom_${field}`];
    return customValue !== undefined && customValue !== null ? customValue : defaultValue;
  };

  const isFieldLoading = (permitTypeId: string, field: string) => {
    return savingFields.has(`${permitTypeId}-${field}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Municipal Permit Types</CardTitle>
          <CardDescription>
            Customize permit types for your municipality. Click on any field to edit it inline.
            Customized fields are highlighted, and you can reset them to standard values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
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
                    <TableHead>Municipal Label</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Processing Days</TableHead>
                    <TableHead>Inspection Required</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permitTypes.map((permit) => {
                    const isCustomized = permit.is_customized;
                    
                    return (
                      <TableRow key={permit.permit_type_id} className={isCustomized ? 'bg-muted/20' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{permit.permit_type_name}</span>
                            {isCustomized && (
                              <Badge variant="secondary" className="text-xs">
                                Customized
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <InlineEditField
                            value={getFieldValue(permit, 'municipal_label', permit.permit_type_name) || permit.permit_type_name}
                            onSave={(value) => handleFieldUpdate(permit.permit_type_id, 'municipal_label', value)}
                            type="text"
                            placeholder={permit.permit_type_name}
                            isLoading={isFieldLoading(permit.permit_type_id, 'municipal_label')}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <InlineEditField
                            value={getFieldValue(permit, 'fee_cents', permit.standard_fee_cents) / 100}
                            onSave={(value) => handleFieldUpdate(permit.permit_type_id, 'base_fee_cents', value)}
                            type="number"
                            prefix="$"
                            placeholder={formatCurrency(permit.standard_fee_cents)}
                            isLoading={isFieldLoading(permit.permit_type_id, 'base_fee_cents')}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <InlineEditField
                            value={getFieldValue(permit, 'processing_days', permit.standard_processing_days)}
                            onSave={(value) => handleFieldUpdate(permit.permit_type_id, 'processing_days', value)}
                            type="number"
                            placeholder={`${permit.standard_processing_days} days`}
                            isLoading={isFieldLoading(permit.permit_type_id, 'processing_days')}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <InlineEditField
                            value={getFieldValue(permit, 'requires_inspection', permit.standard_requires_inspection)}
                            onSave={(value) => handleFieldUpdate(permit.permit_type_id, 'requires_inspection', value)}
                            type="boolean"
                            isLoading={isFieldLoading(permit.permit_type_id, 'requires_inspection')}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <InlineEditField
                            value={permit.merchant_id || ''}
                            onSave={(value) => handleFieldUpdate(permit.permit_type_id, 'merchant_id', value)}
                            type="select"
                            options={[
                              { value: '', label: 'No merchant assigned' },
                              ...merchantOptions
                            ]}
                            placeholder="Select merchant"
                            isLoading={isFieldLoading(permit.permit_type_id, 'merchant_id')}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <InlineEditField
                            value={permit.is_active ?? true}
                            onSave={(value) => handleFieldUpdate(permit.permit_type_id, 'is_active', value)}
                            type="boolean"
                            isLoading={isFieldLoading(permit.permit_type_id, 'is_active')}
                          />
                        </TableCell>
                        
                        <TableCell>
                          {isCustomized && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetToStandard(permit.permit_type_id)}
                              disabled={deleteMutation.isPending}
                              title="Reset to standard settings"
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};