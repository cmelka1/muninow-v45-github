import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Save, X, Upload, Plus, FileText, Download, Trash2 } from 'lucide-react';
import { useCustomerMerchants } from '@/hooks/useCustomerMerchants';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useAllMunicipalTaxTypes,
  useUpdateMunicipalTaxTypes,
  useCreateMunicipalTaxType,
  useUploadTaxInstructionDocument,
  useDeleteMunicipalTaxType,
  type MunicipalTaxType,
} from '@/hooks/useMunicipalTaxTypes';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isEditMode: boolean;
  className?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  placeholder,
  isEditMode,
  className = ''
}) => {
  if (!isEditMode) {
    return (
      <span className="text-sm font-medium">
        {value || placeholder}
      </span>
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full ${className}`}
    />
  );
};

interface NewTaxTypeRowProps {
  onAdd: (taxType: { name: string }) => void;
  isLoading: boolean;
}

const NewTaxTypeRow: React.FC<NewTaxTypeRowProps> = ({ onAdd, isLoading }) => {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) {
      return;
    }
    
    onAdd({ name: name.trim() });
    setName('');
  };

  return (
    <TableRow className="bg-muted/10">
      <TableCell>
        <Input
          placeholder="Enter tax type name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">Set after creation</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          New
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          onClick={handleAdd}
          disabled={isLoading || !name.trim()}
          size="sm"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const TaxesSettingsTab = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Queries and mutations
  const { data: taxTypes = [], isLoading } = useAllMunicipalTaxTypes();
  const { data: merchants = [] } = useCustomerMerchants();
  const updateTaxTypesMutation = useUpdateMunicipalTaxTypes();
  const createTaxTypeMutation = useCreateMunicipalTaxType();
  const uploadDocumentMutation = useUploadTaxInstructionDocument();
  const deleteTaxTypeMutation = useDeleteMunicipalTaxType();

  // Auto-enable edit mode when there are no tax types
  React.useEffect(() => {
    if (!isLoading && taxTypes.length === 0 && !isEditMode) {
      setIsEditMode(true);
    }
  }, [taxTypes.length, isLoading, isEditMode]);

  const handleFieldChange = (taxTypeId: string, field: string, value: any) => {
    setChanges(prev => ({
      ...prev,
      [`${taxTypeId}::${field}`]: value
    }));
  };

  const getFieldValue = (taxType: MunicipalTaxType, field: string, defaultValue: any) => {
    const changeKey = `${taxType.id}::${field}`;
    if (changes[changeKey] !== undefined) {
      return changes[changeKey];
    }
    return defaultValue;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(changes).reduce((acc, [key, value]) => {
        const [taxTypeId, field] = key.split('::');
        if (!acc[taxTypeId]) acc[taxTypeId] = {};
        
        if (field === 'tax_type_name') {
          acc[taxTypeId].tax_type_name = value;
          // Auto-generate tax_type_code from name
          acc[taxTypeId].tax_type_code = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
        } else if (field === 'merchant_id') {
          acc[taxTypeId].merchant_id = value === 'none' ? null : value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Save all updates
      const updatePromises = Object.entries(updates).map(([taxTypeId, updateData]) => {
        const taxType = taxTypes.find(t => t.id === taxTypeId);
        return updateTaxTypesMutation.mutateAsync([{
          id: taxTypeId,
          tax_type_name: updateData.tax_type_name || taxType?.tax_type_name || '',
          tax_type_code: updateData.tax_type_code || taxType?.tax_type_code || '',
          description: taxType?.description || '',
          is_active: taxType?.is_active ?? true,
          display_order: taxType?.display_order || 0,
          required_documents: taxType?.required_documents || [],
          instructions_document_path: taxType?.instructions_document_path || null,
          merchant_id: updateData.merchant_id !== undefined ? updateData.merchant_id : taxType?.merchant_id,
        }]);
      });

      await Promise.all(updatePromises);

      setChanges({});
      setIsEditMode(false);
      toast({
        title: "Tax types updated",
        description: "Your tax type configuration has been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating tax types:', error);
      toast({
        title: "Error",
        description: "Failed to update tax types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setChanges({});
    setIsEditMode(false);
  };

  const handleAddCustomType = async (taxType: { name: string }) => {
    try {
      await createTaxTypeMutation.mutateAsync({
        tax_type_name: taxType.name,
        tax_type_code: taxType.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        description: '',
        display_order: Math.max(...taxTypes.map(t => t.display_order), 0) + 1,
        required_documents: [],
        instructions_document_path: null,
      });
      
      toast({
        title: "Tax type created",
        description: "New tax type has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating tax type:', error);
      toast({
        title: "Error",
        description: "Failed to create tax type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentDownload = async (documentPath: string) => {
    try {
      const { data } = supabase.storage
        .from('tax-instructions')
        .getPublicUrl(documentPath);
      
      if (data?.publicUrl) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = data.publicUrl;
        link.download = documentPath.split('/').pop() || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download Error",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (file: File, taxTypeId: string) => {
    try {
      const filePath = await uploadDocumentMutation.mutateAsync({ file, taxTypeId });
      
      toast({
        title: "Document uploaded",
        description: "Instruction document has been uploaded and saved successfully.",
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (taxTypeId: string, taxTypeName: string) => {
    if (!confirm(`Are you sure you want to delete "${taxTypeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTaxTypeMutation.mutateAsync(taxTypeId);
      
      toast({
        title: "Tax type deleted",
        description: `"${taxTypeName}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting tax type:', error);
      toast({
        title: "Error",
        description: "Failed to delete tax type. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Tax Types</CardTitle>
            <CardDescription>
              Configure tax types and upload instruction documents for your municipality.
              New tax types are saved immediately when created. Documents are saved immediately upon upload. 
              Other changes require clicking Save to apply them.
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
              <div className="text-muted-foreground">Loading tax types...</div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Instructions Document</TableHead>
                    {isEditMode && <TableHead className="w-20">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxTypes.map((taxType) => (
                    <TableRow key={taxType.id}>
                      <TableCell className="font-medium">
                        <EditableField
                          value={getFieldValue(taxType, 'tax_type_name', taxType.tax_type_name)}
                          onChange={(value) => handleFieldChange(taxType.id, 'tax_type_name', value)}
                          placeholder={taxType.tax_type_name}
                          isEditMode={isEditMode}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditMode ? (
                          <Select
                            value={getFieldValue(taxType, 'merchant_id', taxType.merchant_id || 'none')}
                            onValueChange={(value) => handleFieldChange(taxType.id, 'merchant_id', value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select merchant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Default (Municipality)</SelectItem>
                              {merchants.map((merchant) => (
                                <SelectItem key={merchant.id} value={merchant.id}>
                                  {merchant.merchant_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">
                            {taxType.merchant_id 
                              ? merchants.find(m => m.id === taxType.merchant_id)?.merchant_name || 'Custom'
                              : 'Default (Municipality)'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {taxType.instructions_document_path ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">Document uploaded</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDocumentDownload(taxType.instructions_document_path!)}
                                className="h-6 px-2"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">No document</span>
                            </div>
                          )}
                          {isEditMode && (
                            <>
                              <Label htmlFor={`file-${taxType.id}`} className="cursor-pointer">
                                <Button size="sm" variant="outline" asChild>
                                  <span>
                                    <Upload className="h-4 w-4 mr-1" />
                                    {taxType.instructions_document_path ? 'Replace' : 'Upload'}
                                  </span>
                                </Button>
                              </Label>
                              <input
                                id={`file-${taxType.id}`}
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(file, taxType.id);
                                }}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                      {isEditMode && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(taxType.id, taxType.tax_type_name)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deleteTaxTypeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  
                  {(isEditMode || taxTypes.length === 0) && (
                    <NewTaxTypeRow
                      onAdd={handleAddCustomType}
                      isLoading={createTaxTypeMutation.isPending}
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