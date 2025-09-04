import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Save, X, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAllMunicipalTaxTypes,
  useUpdateMunicipalTaxTypes,
  useCreateMunicipalTaxType,
  useDeleteMunicipalTaxType,
  useUploadTaxInstructionDocument,
  type MunicipalTaxType,
  type UpdateMunicipalTaxTypeData,
  type CreateMunicipalTaxTypeData,
} from '@/hooks/useMunicipalTaxTypes';

interface EditableTaxType extends MunicipalTaxType {
  isNew?: boolean;
  tempId?: string;
}

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  className?: string;
  disabled?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  disabled = false,
}) => (
  <Input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    className={`border-0 bg-transparent p-1 text-sm focus:bg-background focus:border-border ${className}`}
    disabled={disabled}
  />
);

interface NewTaxTypeRowProps {
  newTaxType: Partial<CreateMunicipalTaxTypeData>;
  onUpdate: (updates: Partial<CreateMunicipalTaxTypeData>) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const NewTaxTypeRow: React.FC<NewTaxTypeRowProps> = ({
  newTaxType,
  onUpdate,
  onSave,
  onCancel,
  isSaving,
}) => (
  <TableRow className="bg-muted/30">
    <TableCell className="p-2">
      <EditableField
        value={newTaxType.tax_type_name || ''}
        onChange={(value) => onUpdate({ tax_type_name: value })}
        placeholder="Enter tax type name"
      />
    </TableCell>
    <TableCell className="p-2">
      <EditableField
        value={newTaxType.tax_type_code || ''}
        onChange={(value) => onUpdate({ tax_type_code: value })}
        placeholder="Enter tax code"
      />
    </TableCell>
    <TableCell className="p-2">
      <Textarea
        value={newTaxType.description || ''}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="Enter description"
        className="border-0 bg-transparent p-1 text-sm focus:bg-background focus:border-border min-h-[60px] resize-none"
      />
    </TableCell>
    <TableCell className="p-2">
      <EditableField
        value={(newTaxType.display_order || 0).toString()}
        onChange={(value) => onUpdate({ display_order: parseInt(value) || 0 })}
        type="number"
        placeholder="0"
      />
    </TableCell>
    <TableCell className="p-2">
      <Badge variant="secondary">Active</Badge>
    </TableCell>
    <TableCell className="p-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !newTaxType.tax_type_name || !newTaxType.tax_type_code}
          className="h-7 px-2"
        >
          <Save className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
          className="h-7 px-2"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </TableCell>
  </TableRow>
);

export const TaxesSettingsTab = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableTaxTypes, setEditableTaxTypes] = useState<EditableTaxType[]>([]);
  const [showNewRow, setShowNewRow] = useState(false);
  const [newTaxType, setNewTaxType] = useState<Partial<CreateMunicipalTaxTypeData>>({});

  // Queries and mutations
  const { data: taxTypes = [], isLoading } = useAllMunicipalTaxTypes();
  const updateTaxTypesMutation = useUpdateMunicipalTaxTypes();
  const createTaxTypeMutation = useCreateMunicipalTaxType();
  const deleteTaxTypeMutation = useDeleteMunicipalTaxType();
  const uploadDocumentMutation = useUploadTaxInstructionDocument();

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel editing - revert changes
      setEditableTaxTypes([]);
      setShowNewRow(false);
      setNewTaxType({});
    } else {
      // Enter edit mode - create editable copies
      setEditableTaxTypes(taxTypes.map(type => ({ ...type })));
    }
    setIsEditMode(!isEditMode);
  };

  const updateEditableTaxType = (id: string, updates: Partial<MunicipalTaxType>) => {
    setEditableTaxTypes(prev =>
      prev.map(type => type.id === id ? { ...type, ...updates } : type)
    );
  };

  const handleSave = async () => {
    try {
      const updates: UpdateMunicipalTaxTypeData[] = editableTaxTypes
        .filter(type => !type.isNew)
        .map(type => ({
          id: type.id,
          tax_type_name: type.tax_type_name,
          tax_type_code: type.tax_type_code,
          description: type.description,
          is_active: type.is_active,
          display_order: type.display_order,
          required_documents: type.required_documents,
          instructions_document_path: type.instructions_document_path,
        }));

      if (updates.length > 0) {
        await updateTaxTypesMutation.mutateAsync(updates);
      }

      setIsEditMode(false);
      setEditableTaxTypes([]);
      
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
    }
  };

  const handleAddNewTaxType = () => {
    setShowNewRow(true);
    setNewTaxType({
      display_order: Math.max(...taxTypes.map(t => t.display_order), 0) + 1,
    });
  };

  const handleSaveNewTaxType = async () => {
    if (!newTaxType.tax_type_name || !newTaxType.tax_type_code) {
      toast({
        title: "Error",
        description: "Tax type name and code are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTaxTypeMutation.mutateAsync(newTaxType as CreateMunicipalTaxTypeData);
      setShowNewRow(false);
      setNewTaxType({});
      
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

  const handleDeleteTaxType = async (id: string) => {
    try {
      await deleteTaxTypeMutation.mutateAsync(id);
      toast({
        title: "Tax type deleted",
        description: "Tax type has been deleted successfully.",
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

  const handleFileUpload = async (file: File, taxTypeId: string) => {
    try {
      const filePath = await uploadDocumentMutation.mutateAsync({ file, taxTypeId });
      
      if (isEditMode) {
        updateEditableTaxType(taxTypeId, { instructions_document_path: filePath });
      }
      
      toast({
        title: "Document uploaded",
        description: "Instruction document has been uploaded successfully.",
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

  const displayTaxTypes = isEditMode ? editableTaxTypes : taxTypes;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading tax types...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Types Configuration</CardTitle>
              <CardDescription>
                Configure custom tax types for your municipality.
                {isEditMode && ' Make changes and click Save to apply them.'}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isEditMode && (
                <Button
                  onClick={handleAddNewTaxType}
                  size="sm"
                  variant="outline"
                  disabled={showNewRow}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tax Type
                </Button>
              )}
              <Button
                onClick={isEditMode ? handleSave : handleEditToggle}
                size="sm"
                disabled={updateTaxTypesMutation.isPending}
                className="h-8"
              >
                {isEditMode ? (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </>
                ) : (
                  'Edit'
                )}
              </Button>
              {isEditMode && (
                <Button
                  onClick={handleEditToggle}
                  size="sm"
                  variant="outline"
                  disabled={updateTaxTypesMutation.isPending}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayTaxTypes.length === 0 && !showNewRow ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-2">No tax types configured</p>
              <p className="text-sm mb-4">Create your first custom tax type to get started.</p>
              <Button onClick={handleEditToggle} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Tax Type
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Type Name</TableHead>
                    <TableHead>Tax Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Order</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTaxTypes.map((taxType) => (
                    <TableRow key={taxType.id}>
                      <TableCell className="p-2">
                        {isEditMode ? (
                          <EditableField
                            value={taxType.tax_type_name}
                            onChange={(value) => updateEditableTaxType(taxType.id, { tax_type_name: value })}
                            placeholder="Enter tax type name"
                          />
                        ) : (
                          <span className="font-medium">{taxType.tax_type_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        {isEditMode ? (
                          <EditableField
                            value={taxType.tax_type_code}
                            onChange={(value) => updateEditableTaxType(taxType.id, { tax_type_code: value })}
                            placeholder="Enter tax code"
                          />
                        ) : (
                          <code className="text-sm bg-muted px-2 py-1 rounded">{taxType.tax_type_code}</code>
                        )}
                      </TableCell>
                      <TableCell className="p-2 max-w-xs">
                        {isEditMode ? (
                          <Textarea
                            value={taxType.description || ''}
                            onChange={(e) => updateEditableTaxType(taxType.id, { description: e.target.value })}
                            placeholder="Enter description"
                            className="border-0 bg-transparent p-1 text-sm focus:bg-background focus:border-border min-h-[60px] resize-none"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {taxType.description || 'No description'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        {isEditMode ? (
                          <EditableField
                            value={taxType.display_order.toString()}
                            onChange={(value) => updateEditableTaxType(taxType.id, { display_order: parseInt(value) || 0 })}
                            type="number"
                            className="w-16"
                          />
                        ) : (
                          <span className="text-sm">{taxType.display_order}</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        {isEditMode ? (
                          <Switch
                            checked={taxType.is_active}
                            onCheckedChange={(checked) => updateEditableTaxType(taxType.id, { is_active: checked })}
                          />
                        ) : (
                          <Badge variant={taxType.is_active ? 'default' : 'secondary'}>
                            {taxType.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="flex items-center gap-2">
                          {isEditMode ? (
                            <>
                              <Label htmlFor={`file-${taxType.id}`} className="cursor-pointer">
                                <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                                  <span>
                                    <Upload className="h-3 w-3" />
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTaxType(taxType.id)}
                                className="h-7 px-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              {taxType.instructions_document_path && (
                                <Button size="sm" variant="ghost" className="h-7 px-2">
                                  <FileText className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {showNewRow && (
                    <NewTaxTypeRow
                      newTaxType={newTaxType}
                      onUpdate={setNewTaxType}
                      onSave={handleSaveNewTaxType}
                      onCancel={() => {
                        setShowNewRow(false);
                        setNewTaxType({});
                      }}
                      isSaving={createTaxTypeMutation.isPending}
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