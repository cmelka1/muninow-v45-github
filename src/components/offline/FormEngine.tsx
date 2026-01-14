import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useOffline } from './OfflineProvider';
import { saveDraft, getDraft } from '@/lib/offline-db';
import { PhotoCapture } from './PhotoCapture';
import { SignaturePad } from './SignaturePad';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebounce } from 'use-debounce';

interface FormSchema {
  sections: {
    id: string;
    title: string;
    items: {
      id: string;
      label: string;
      type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'photo' | 'signature';
      options?: string[]; // For select
      required?: boolean;
    }[];
  }[];
}

interface FormEngineProps {
  inspectionId: string;
  template: FormSchema;
  initialData?: any;
}

export const FormEngine: React.FC<FormEngineProps> = ({ inspectionId, template, initialData }) => {
  const methods = useForm({
    defaultValues: initialData || {},
    mode: 'onChange'
  });
  
  const { watch, setValue } = methods;
  const formData = watch(); // Watch all fields
  const [debouncedParams] = useDebounce(formData, 1000); // Debounce saves by 1s
  const { isOnline } = useOffline();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load draft on mount (priority over initialData if exists)
  useEffect(() => {
    const loadLocalDraft = async () => {
      const draft = await getDraft(inspectionId);
      if (draft && draft.data) {
        // Merge draft data into form
        Object.keys(draft.data).forEach(key => {
          setValue(key, draft.data[key]);
        });
      }
    };
    loadLocalDraft();
  }, [inspectionId, setValue]);

  // Auto-save effect
  useEffect(() => {
    if (debouncedParams && Object.keys(debouncedParams).length > 0) {
      saveDraft(inspectionId, debouncedParams).then(() => {
        setLastSaved(new Date());
      });
    }
  }, [debouncedParams, inspectionId]);

  return (
    <FormProvider {...methods}>
      <form className="space-y-8 pb-20">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b p-2 flex justify-between items-center text-xs text-muted-foreground">
          <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
          <span>
            {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Unsaved'}
          </span>
        </div>

        {template.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {section.items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <Label htmlFor={item.id}>
                    {item.label} {item.required && <span className="text-red-500">*</span>}
                  </Label>

                  {/* Field Rendering Switch */}
                  {item.type === 'text' && (
                    <Input {...methods.register(item.id, { required: item.required })} />
                  )}

                  {item.type === 'number' && (
                    <Input type="number" {...methods.register(item.id, { required: item.required })} />
                  )}

                  {item.type === 'textarea' && (
                    <Textarea {...methods.register(item.id, { required: item.required })} />
                  )}

                  {item.type === 'select' && (
                    <Select onValueChange={(val) => setValue(item.id, val)} defaultValue={formData[item.id]}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        {item.options?.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {item.type === 'checkbox' && (
                    <div className="flex items-center space-x-2">
                       <Checkbox 
                         id={item.id} 
                         checked={formData[item.id]}
                         onCheckedChange={(checked) => setValue(item.id, checked)}
                       />
                       <label htmlFor={item.id} className="text-sm font-medium leading-none">
                         {item.label}
                       </label>
                    </div>
                  )}

                  {item.type === 'photo' && (
                    <PhotoCapture 
                      inspectionId={inspectionId}
                      itemId={item.id}
                      initialPhotoUrl={formData[item.id]} // Expect this to be a blob URL or public URL
                      onCapture={(photoId, previewUrl) => {
                        // Store the Photo ID reference in the form JSON
                        // The actual Blob is in the media_queue store
                        setValue(item.id, { type: 'photo_ref', id: photoId, url: previewUrl });
                      }}
                    />
                  )}

                  {item.type === 'signature' && (
                    <SignaturePad 
                      inspectionId={inspectionId}
                      role={item.id.includes('inspector') ? 'inspector' : 'customer'}
                      onSave={(sigId, name) => {
                         setValue(item.id, { type: 'sig_ref', id: sigId, name: name });
                      }}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </form>
    </FormProvider>
  );
};
