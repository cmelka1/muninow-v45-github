import React, { useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import {
  FileText,
  Download,
  Copy,
  AlertCircle,
  Upload,
  X,
  Image,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isAddressField, validateFile, type FormFieldConfig } from '@/utils/serviceFormUtils';

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  documentType: string;
  description?: string;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  filePath?: string;
  error?: string;
}

interface ApplicationFormStepProps {
  tile: MunicipalServiceTile;
  formData: Record<string, any>;
  onFormDataChange: (data: Record<string, any>) => void;
  uploadedDocuments: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[] | ((prev: UploadedDocument[]) => UploadedDocument[])) => void;
  validationErrors: Record<string, string>;
  onValidationErrorsChange: (errors: Record<string, string>) => void;
  useAutoPopulate: boolean;
  onAutoPopulateChange: (value: boolean) => void;
  onNext: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  userId: string | undefined;
}

export const ApplicationFormStep: React.FC<ApplicationFormStepProps> = ({
  tile,
  formData,
  onFormDataChange,
  uploadedDocuments,
  onDocumentsChange,
  validationErrors,
  onValidationErrorsChange,
  useAutoPopulate,
  onAutoPopulateChange,
  onNext,
  onClose,
  isSubmitting,
  userId,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (fieldId: string, value: any) => {
    onFormDataChange({
      ...formData,
      [fieldId]: value,
    });
    clearFieldError(fieldId);
  };

  const handleAddressAutocompleteSelect = (
    fieldId: string,
    addressComponents: {
      streetAddress: string;
      city: string;
      state: string;
      zipCode: string;
    }
  ) => {
    const fullAddress = `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`;
    onFormDataChange({
      ...formData,
      [fieldId]: fullAddress,
    });
    clearFieldError(fieldId);
  };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      const newErrors = { ...validationErrors };
      delete newErrors[fieldName];
      onValidationErrorsChange(newErrors);
    }
  };

  const renderFormField = (field: FormFieldConfig) => {
    const { id, type, label, placeholder, options } = field;

    if (isAddressField(id)) {
      return (
        <RestPlacesAutocomplete
          key={id}
          placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
          onAddressSelect={(addressComponents) =>
            handleAddressAutocompleteSelect(id, addressComponents)
          }
          value={formData[id] || ''}
          onChange={(value) => handleInputChange(id, value)}
          className={validationErrors[id] ? 'ring-2 ring-destructive border-destructive' : ''}
        />
      );
    }

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            key={id}
            value={formData[id] || ''}
            onChange={(e) => handleInputChange(id, e.target.value)}
            placeholder={placeholder}
            rows={4}
            className={validationErrors[id] ? 'border-destructive' : ''}
          />
        );

      case 'rich-text':
        return (
          <RichTextEditor
            key={id}
            content={formData[id] || ''}
            onChange={(content) => handleInputChange(id, content)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            className="w-full"
          />
        );

      case 'select':
        return (
          <Select
            key={id}
            value={formData[id] || ''}
            onValueChange={(value) => handleInputChange(id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder || `Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            key={id}
            type="number"
            value={formData[id] || ''}
            onChange={(e) => handleInputChange(id, parseFloat(e.target.value) || 0)}
            placeholder={placeholder}
          />
        );

      default:
        return (
          <Input
            key={id}
            type={type}
            value={formData[id] || ''}
            onChange={(e) => handleInputChange(id, e.target.value)}
            placeholder={placeholder}
            data-error={validationErrors[id] ? 'true' : 'false'}
            className={validationErrors[id] ? 'border-destructive' : ''}
          />
        );
    }
  };

  const uploadFile = async (file: File, documentId: string) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${userId}/service-applications/${documentId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('service-application-documents')
      .upload(filePath, file);

    if (error) throw error;
    return { path: data.path, fileName };
  };

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: 'File validation error',
          description: validationError,
          variant: 'destructive',
        });
        continue;
      }

      const documentId = crypto.randomUUID();
      const newDocument: UploadedDocument = {
        id: documentId,
        name: file.name,
        size: file.size,
        type: file.type,
        documentType: 'general',
        uploadProgress: 0,
        uploadStatus: 'uploading',
      };

      onDocumentsChange(prev => [...prev, newDocument]);

      try {
        const { path } = await uploadFile(file, documentId);

        onDocumentsChange(prev =>
          prev.map((doc) =>
            doc.id === documentId
              ? { ...doc, uploadStatus: 'completed', uploadProgress: 100, filePath: path }
              : doc
          )
        );

        toast({
          title: 'File uploaded successfully',
          description: `${file.name} has been uploaded.`,
        });
      } catch (error) {
        console.error('Upload failed:', error);
        onDocumentsChange(prev =>
          prev.map((doc) =>
            doc.id === documentId
              ? { ...doc, uploadStatus: 'error', error: 'Upload failed' }
              : doc
          )
        );

        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    onDocumentsChange(uploadedDocuments.filter((doc) => doc.id !== documentId));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <FileCheck className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Application Directions Box */}
      <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-900">
        <Info className="h-4 w-4" />
        <AlertTitle>Directions</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            {tile.guidance_text ? (
              <p>{tile.guidance_text}</p>
            ) : (
              <>
                <p>
                  Please review the attached PDF carefully and either (a) provide responses to any
                  applicable questions in the Additional Information text area, or (b) upload a
                  completed copy of the document in the Document Upload section.
                </p>
                <p>
                  If your payment amount is variable, please calculate the amount due and enter
                  both the total and the calculation reasoning as the final item in the Additional
                  Information text area.
                </p>
              </>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* PDF Download Section */}
      {tile.pdf_form_url && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <FileText className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-2">Official Form Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download the official PDF form directly to your device.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(tile.pdf_form_url);

                        if (!response.ok) {
                          throw new Error('Failed to download PDF');
                        }

                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);

                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = tile.pdf_form_url.split('/').pop() || 'form.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        URL.revokeObjectURL(blobUrl);
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        toast({
                          title: 'Download Failed',
                          description: 'Unable to download the PDF. Please try again.',
                          variant: 'destructive',
                        });
                      }
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF Form
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(tile.pdf_form_url);
                      toast({ title: 'Link copied to clipboard' });
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Sections */}
      <div className="space-y-4">
        {/* Section 1: Application Information */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Application Information
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Label htmlFor="use-profile-info" className="text-sm text-muted-foreground">
                Use Profile Information
              </Label>
              <Switch
                id="use-profile-info"
                checked={useAutoPopulate}
                onCheckedChange={onAutoPopulateChange}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {tile.form_fields?.map((field: any) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderFormField(field)}
                {validationErrors[field.id] && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors[field.id]}
                  </p>
                )}
              </div>
            ))}

            {/* User-Defined Amount Field */}
            {tile.allow_user_defined_amount && (
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount_cents ? (formData.amount_cents / 100).toFixed(2) : ''}
                  onChange={(e) =>
                    handleInputChange(
                      'amount_cents',
                      Math.round(parseFloat(e.target.value || '0') * 100)
                    )
                  }
                  placeholder="Enter amount"
                  className={validationErrors.amount_cents ? 'border-destructive' : ''}
                />
                {validationErrors.amount_cents && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors.amount_cents}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Document Upload */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Document Upload
              <Badge
                variant={tile.requires_document_upload ? 'default' : 'secondary'}
                className="ml-2"
              >
                {tile.requires_document_upload ? 'Required' : 'Optional'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Supporting Documents{' '}
                  {tile.requires_document_upload && <span className="text-destructive ml-1">*</span>}
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload any documents that support your application
                </p>

                {/* Drag and Drop Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="document-upload"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                  />
                  <label htmlFor="document-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium text-foreground mb-1">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, JPG, or PNG (max 10MB each)
                    </span>
                  </label>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div className="space-y-3">
                  {uploadedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(doc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Review Required Info Box */}
        {tile.requires_review && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Review Required:</strong> This application will be reviewed by municipal staff
              before approval. Payment will only be processed after approval.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onClose}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </>
  );
};
