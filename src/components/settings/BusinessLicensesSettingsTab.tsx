import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';
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

export const BusinessLicensesSettingsTab = () => {
  const { profile } = useAuth();
  const { data: businessLicensesMerchant } = useBusinessLicensesMerchant(profile?.customer_id);
  const { data: municipalTypes = [], isLoading } = useMunicipalBusinessLicenseTypes(profile?.customer_id);
  
  const createMutation = useCreateMunicipalBusinessLicenseType();
  const updateMutation = useUpdateMunicipalBusinessLicenseType();
  const deleteMutation = useDeleteMunicipalBusinessLicenseType();
  const initializeMutation = useInitializeMunicipalBusinessLicenseTypes();
  
  const [editingType, setEditingType] = useState<MunicipalBusinessLicenseType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    municipal_label: '',
    base_fee_cents: 0,
  });

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

  const handleEdit = (type: MunicipalBusinessLicenseType) => {
    setEditingType(type);
    setFormData({
      municipal_label: type.municipal_label,
      base_fee_cents: type.base_fee_cents,
    });
  };

  const handleSaveEdit = () => {
    if (!editingType) return;
    
    updateMutation.mutate({
      id: editingType.id,
      data: {
        municipal_label: formData.municipal_label,
        base_fee_cents: formData.base_fee_cents,
      }
    }, {
      onSuccess: () => {
        setEditingType(null);
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setFormData({ municipal_label: '', base_fee_cents: 0 });
  };

  const handleDelete = (type: MunicipalBusinessLicenseType) => {
    if (!type.is_custom) return; // Only allow deletion of custom types
    
    if (window.confirm(`Are you sure you want to delete "${type.municipal_label}"?`)) {
      deleteMutation.mutate(type.id);
    }
  };

  const handleCreate = () => {
    if (!profile?.customer_id || !businessLicensesMerchant) return;

    createMutation.mutate({
      customer_id: profile.customer_id,
      merchant_id: businessLicensesMerchant.id,
      merchant_name: businessLicensesMerchant.merchant_name,
      municipal_label: formData.municipal_label,
      base_fee_cents: formData.base_fee_cents,
      is_custom: true,
      display_order: municipalTypes.length,
    }, {
      onSuccess: () => {
        setFormData({ municipal_label: '', base_fee_cents: 0 });
        setIsCreateDialogOpen(false);
      }
    });
  };

  const parseCurrencyToCents = (value: string) => {
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    return Math.round((isNaN(numericValue) ? 0 : numericValue) * 100);
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
              {businessLicensesMerchant && ` Associated with ${businessLicensesMerchant.merchant_name}.`}
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Business License Type</DialogTitle>
                <DialogDescription>
                  Create a new business license type specific to your municipality.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="create-label">Business License Type</Label>
                  <Input
                    id="create-label"
                    value={formData.municipal_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, municipal_label: e.target.value }))}
                    placeholder="Enter license type name"
                  />
                </div>
                <div>
                  <Label htmlFor="create-fee">Fee</Label>
                  <Input
                    id="create-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_fee_cents / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_fee_cents: parseCurrencyToCents(e.target.value) }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.municipal_label.trim()}>
                  Create Type
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business License Type</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {municipalTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      {editingType?.id === type.id ? (
                        <Input
                          value={formData.municipal_label}
                          onChange={(e) => setFormData(prev => ({ ...prev, municipal_label: e.target.value }))}
                          className="w-full"
                        />
                      ) : (
                        <span className="font-medium">{type.municipal_label}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingType?.id === type.id ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.base_fee_cents / 100}
                            onChange={(e) => setFormData(prev => ({ ...prev, base_fee_cents: parseCurrencyToCents(e.target.value) }))}
                            className="w-24"
                          />
                        </div>
                      ) : (
                        <span className="font-mono">{formatCurrency(type.base_fee_cents / 100)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {editingType?.id === type.id ? (
                          <>
                            <Button size="sm" onClick={handleSaveEdit}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(type)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {type.is_custom && (
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(type)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};