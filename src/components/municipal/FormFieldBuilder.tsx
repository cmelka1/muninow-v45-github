import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GripVertical } from 'lucide-react';
// Using crypto.randomUUID() instead of uuid package

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface FormFieldBuilderProps {
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
}

export function FormFieldBuilder({ fields, onFieldsChange }: FormFieldBuilderProps) {
  const [newFieldType, setNewFieldType] = useState<FormField['type']>('text');

  const fieldTypeLabels = {
    text: 'Text Input',
    textarea: 'Text Area',
    number: 'Number',
    email: 'Email',
    phone: 'Phone',
    date: 'Date',
    select: 'Dropdown Select',
  };

  const addField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      label: '',
      type: newFieldType,
      required: false,
      placeholder: '',
      options: newFieldType === 'select' ? [''] : undefined,
    };
    onFieldsChange([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onFieldsChange(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    onFieldsChange(fields.filter(field => field.id !== id));
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex(field => field.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const newFields = [...fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];
    onFieldsChange(newFields);
  };

  const updateSelectOptions = (fieldId: string, options: string[]) => {
    updateField(fieldId, { options });
  };

  return (
    <div className="space-y-4">
      {/* Existing Fields */}
      {fields.map((field, index) => (
        <Card key={field.id} className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                Field {index + 1}
                <Badge variant="outline">{fieldTypeLabels[field.type]}</Badge>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveField(field.id, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveField(field.id, 'down')}
                  disabled={index === fields.length - 1}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeField(field.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`label-${field.id}`}>Field Label *</Label>
                <Input
                  id={`label-${field.id}`}
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Enter field label"
                />
              </div>
              <div>
                <Label htmlFor={`placeholder-${field.id}`}>Placeholder Text</Label>
                <Input
                  id={`placeholder-${field.id}`}
                  value={field.placeholder || ''}
                  onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                  placeholder="Enter placeholder text"
                />
              </div>
            </div>

            {/* Select Options */}
            {field.type === 'select' && (
              <div>
                <Label>Dropdown Options</Label>
                <div className="space-y-2 mt-2">
                  {(field.options || []).map((option, optionIndex) => (
                    <div key={optionIndex} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(field.options || [])];
                          newOptions[optionIndex] = e.target.value;
                          updateSelectOptions(field.id, newOptions);
                        }}
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newOptions = (field.options || []).filter((_, i) => i !== optionIndex);
                          updateSelectOptions(field.id, newOptions);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateSelectOptions(field.id, [...(field.options || []), '']);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`required-${field.id}`}
                  checked={field.required}
                  onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                />
                <Label htmlFor={`required-${field.id}`}>Required Field</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add New Field */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as FormField['type'])}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(fieldTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={addField} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
