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
import { Loader2 } from 'lucide-react';
import { usePermitTypesWithCustomizations, useUpsertMunicipalPermitType } from '@/hooks/useMunicipalPermitTypes';
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
  const { data: permitTypes, isLoading } = usePermitTypesWithCustomizations();
  const upsertMutation = useUpsertMunicipalPermitType();
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

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
        case 'base_fee_cents':
          updates.base_fee_cents = Math.round(value * 100);
          break;
        case 'processing_days':
          updates.processing_days = value;
          break;
        case 'requires_inspection':
          updates.requires_inspection = value;
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
            Configure permit fees, processing times, and inspection requirements for your municipality. Click on any field to edit it inline.
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
                    <TableHead>Fee</TableHead>
                    <TableHead>Processing Days</TableHead>
                    <TableHead>Inspection Required</TableHead>
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