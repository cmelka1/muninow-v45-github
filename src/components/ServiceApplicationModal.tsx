import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { FileText, Download, User, Copy, ExternalLink, AlertCircle, Upload, X, Image, FileCheck } from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { useCreateServiceApplication } from '@/hooks/useServiceApplications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ServiceApplicationModalProps {
  tile: MunicipalServiceTile | null;
  isOpen: boolean;
  onClose: () => void;
}

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

const DOCUMENT_TYPES = [
  'general',
  'plans',
  'specifications', 
  'inspection',
  'survey',
  'other'
];

const ServiceApplicationModal: React.FC<ServiceApplicationModalProps> = ({
  tile,
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [useAutoPopulate, setUseAutoPopulate] = useState(true);
  const [pdfAccessBlocked, setPdfAccessBlocked] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  const { profile } = useAuth();
  const createApplication = useCreateServiceApplication();

  useEffect(() => {
    if (tile && isOpen) {
      // Initialize form data
      const initialData: Record<string, any> = {};
      
      
      // Initialize form fields first
      tile.form_fields?.forEach(field => {
        initialData[field.id] = field.type === 'number' ? 0 : '';
      });
      
      // Smart auto-population based on actual form field names
      if (useAutoPopulate && profile && tile.form_fields) {
        // Create a mapping of field IDs to check for common patterns
        const fieldIds = tile.form_fields.map(field => field.id.toLowerCase());
        
        // Map profile data to form fields intelligently
        tile.form_fields.forEach(field => {
          const fieldId = field.id.toLowerCase();
          
          // Handle name fields
          if (fieldId === 'name' || fieldId === 'full_name' || fieldId === 'fullname') {
            if (profile.first_name || profile.last_name) {
              initialData[field.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            }
          } else if (fieldId === 'first_name' || fieldId === 'firstname') {
            initialData[field.id] = profile.first_name || '';
          } else if (fieldId === 'last_name' || fieldId === 'lastname') {
            initialData[field.id] = profile.last_name || '';
          }
          
          // Handle address fields
          else if (fieldId === 'address' || fieldId === 'full_address' || fieldId === 'street_address') {
            if (profile.street_address) {
              const addressParts = [
                profile.street_address,
                (profile as any).apt_number ? `Apt ${(profile as any).apt_number}` : '',
                profile.city,
                profile.state,
                profile.zip_code
              ].filter(Boolean);
              initialData[field.id] = addressParts.join(', ');
            }
          } else if (fieldId === 'street' || fieldId === 'street_address') {
            initialData[field.id] = profile.street_address || '';
          } else if (fieldId === 'apt' || fieldId === 'apt_number' || fieldId === 'apartment') {
            initialData[field.id] = (profile as any).apt_number || '';
          } else if (fieldId === 'city') {
            initialData[field.id] = profile.city || '';
          } else if (fieldId === 'state') {
            initialData[field.id] = profile.state || '';
          } else if (fieldId === 'zip' || fieldId === 'zip_code' || fieldId === 'postal_code') {
            initialData[field.id] = profile.zip_code || '';
          }
          
          // Handle contact fields
          else if (fieldId === 'email') {
            initialData[field.id] = profile.email || '';
          } else if (fieldId === 'phone' || fieldId === 'phone_number') {
            initialData[field.id] = profile.phone || '';
          }
          
          // Handle business fields
          else if (fieldId === 'business_name' || fieldId === 'business_legal_name' || fieldId === 'company_name') {
            initialData[field.id] = profile.business_legal_name || '';
          }
        });
      }
      
      // If not auto-populating, preserve existing form data
      if (!useAutoPopulate) {
        tile.form_fields?.forEach(field => {
          initialData[field.id] = formData[field.id] || (field.type === 'number' ? 0 : '');
        });
      }
      
      setFormData(initialData);
      
    }
  }, [tile, isOpen, useAutoPopulate, profile]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tile) return;

    // Validate required fields
    let missingFields: { label: string }[] = tile.form_fields?.filter(field => 
      field.required && (!formData[field.id] || formData[field.id] === '')
    ).map(field => ({ label: field.label })) || [];

    // Add amount validation for user-defined amounts
    if (tile.allow_user_defined_amount && (!formData.amount_cents || formData.amount_cents <= 0)) {
      missingFields = [...missingFields, { label: 'Service Fee Amount' }];
    }

    if (missingFields.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const applicationData = await createApplication.mutateAsync({
        tile_id: tile.id,
        user_id: profile?.id || '',
        customer_id: tile.customer_id,
        form_data: formData,
        status: 'submitted',
        amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
      });

      // Link uploaded documents to the application
      if (uploadedDocuments.length > 0) {
        const documentPromises = uploadedDocuments
          .filter(doc => doc.uploadStatus === 'completed')
          .map(doc => 
            supabase.from('service_application_documents').insert({
              application_id: applicationData.id,
              user_id: profile?.id || '',
              customer_id: tile.customer_id,
              file_name: doc.name,
              document_type: doc.documentType,
              description: doc.description || null,
              storage_path: doc.filePath || '',
              file_size: doc.size,
              content_type: doc.type
            })
          );

        await Promise.all(documentPromises);
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting application:', error);
    }
  };

  const renderFormField = (field: any) => {
    const { id, label, type, options, required, placeholder } = field;
    
    switch (type) {
      case 'textarea':
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
          <Select key={id} value={formData[id] || ''} onValueChange={(value) => handleInputChange(id, value)}>
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
          />
        );
    }
  };

  // File upload handlers
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, JPG, PNG, or GIF files.';
    }

    return null;
  };

  const uploadFile = async (file: File, documentId: string) => {
    if (!profile?.id) {
      throw new Error('User not authenticated');
    }

    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${profile.id}/service-applications/${documentId}/${fileName}`;

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
          title: "File validation error",
          description: validationError,
          variant: "destructive",
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
        uploadStatus: 'uploading'
      };

      setUploadedDocuments(prev => [...prev, newDocument]);

      try {
        const { path } = await uploadFile(file, documentId);
        
        setUploadedDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, uploadStatus: 'completed', uploadProgress: 100, filePath: path }
            : doc
        ));

        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded.`,
        });
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadedDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, uploadStatus: 'error', error: 'Upload failed' }
            : doc
        ));
        
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const handleDocumentTypeChange = (documentId: string, documentType: string) => {
    setUploadedDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, documentType } : doc
    ));
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

  if (!tile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-8">
        <DialogHeader className="space-y-4 pb-6 border-b">
          <div className="space-y-2">
            <DialogTitle className="text-xl font-semibold">
              {tile.title}
            </DialogTitle>
            {!tile.allow_user_defined_amount && (
              <Badge variant="secondary" className="text-sm px-3 py-1 w-fit">
                ${(tile.amount_cents / 100).toFixed(2)}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-base leading-relaxed">
            {tile.description}
          </DialogDescription>
        </DialogHeader>

        {/* Guidance Text Box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>
                Please review the attached PDF carefully and either (a) provide responses to any applicable questions in the Additional Information text area, or (b) upload a completed copy of the document in the Document Upload section.
              </p>
              <p>
                If your payment amount is variable, please calculate the amount due and enter both the total and the calculation reasoning as the final item in the Additional Information text area.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pt-6">
          {/* PDF Form Section */}
          {tile.pdf_form_url && (
            <div className="border rounded-lg p-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Official Form Available</h3>
                    <p className="text-sm text-muted-foreground">
                      Download the official PDF form directly to your device.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        try {
                          if (!tile.pdf_form_url) {
                            throw new Error('PDF form URL not available');
                          }
                          
                          toast({
                            title: "Downloading...",
                            description: "Preparing your PDF download.",
                          });
                          
                          // Fetch the PDF as a blob
                          const response = await fetch(tile.pdf_form_url);
                          if (!response.ok) {
                            throw new Error('Failed to fetch PDF file');
                          }
                          
                          const blob = await response.blob();
                          
                          // Create a download URL from the blob
                          const downloadUrl = URL.createObjectURL(blob);
                          
                          // Create and trigger download
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.download = `${tile.title.replace(/[^a-zA-Z0-9]/g, '_')}_form.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          
                          // Clean up the object URL
                          URL.revokeObjectURL(downloadUrl);
                          
                          toast({
                            title: "Download Complete",
                            description: "The PDF form has been downloaded to your device.",
                          });
                        } catch (error) {
                          console.error('Error downloading PDF:', error);
                          toast({
                            title: "Download Failed",
                            description: "Unable to download PDF form. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-fit"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF Form
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(tile.pdf_form_url!).then(() => {
                          toast({
                            title: "Link Copied",
                            description: "PDF form link copied to clipboard.",
                          });
                        }).catch(() => {
                          toast({
                            title: "Copy Failed",
                            description: "Unable to copy link. Please manually copy the URL below.",
                            variant: "destructive",
                          });
                        });
                      }}
                      className="w-fit"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                  
                  {/* Fallback options when popup is blocked */}
                  {pdfAccessBlocked && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            Having trouble accessing the PDF?
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            • Try allowing popups for this site in your browser settings
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            • Or copy this direct link: 
                            <code className="ml-1 px-1 bg-amber-100 dark:bg-amber-900 rounded text-xs break-all">
                              {tile.pdf_form_url}
                            </code>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Dynamic Form Fields */}
          {tile.form_fields && tile.form_fields.length > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Application Information
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="auto-populate" className="text-sm text-muted-foreground">
                    Use Profile Information
                  </Label>
                  <Switch
                    id="auto-populate"
                    checked={useAutoPopulate}
                    onCheckedChange={(checked) => setUseAutoPopulate(checked)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {tile.form_fields?.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id} className="flex items-center gap-1 text-sm">
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {renderFormField(field)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Upload Section */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Document Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    Supporting Documents <span className="text-muted-foreground">(Optional)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Upload any documents that support your application
                  </p>
                  
                  {/* File Upload Zone */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <div className="text-sm">
                      <label htmlFor="file-upload" className="text-primary hover:text-primary/80 cursor-pointer font-medium">
                        Click to upload
                      </label>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX, JPG, PNG, GIF up to 10MB each
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Uploaded Files List */}
                {uploadedDocuments.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">
                      Uploaded Files ({uploadedDocuments.length})
                    </Label>
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {doc.name}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.size)}</span>
                            {doc.uploadStatus === 'uploading' && (
                              <span className="text-blue-600">Uploading...</span>
                            )}
                            {doc.uploadStatus === 'completed' && (
                              <span className="text-green-600">✓ Uploaded</span>
                            )}
                            {doc.uploadStatus === 'error' && (
                              <span className="text-red-600">Error: {doc.error}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            defaultValue={doc.documentType}
                            onValueChange={(value) => handleDocumentTypeChange(doc.id, value)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="plans">Plans</SelectItem>
                              <SelectItem value="specifications">Specifications</SelectItem>
                              <SelectItem value="inspection">Inspection</SelectItem>
                              <SelectItem value="survey">Survey</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User-Defined Amount Section */}
          {tile.allow_user_defined_amount && (
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Service Fee</h3>
                <Badge variant="outline" className="text-sm px-2 py-1">
                  {formData.amount_cents ? `$${(formData.amount_cents / 100).toFixed(2)}` : 'Not set'}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-1 text-sm">
                  Amount
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_cents ? (formData.amount_cents / 100).toString() : ''}
                    onChange={(e) => handleInputChange('amount_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                    placeholder="0.00"
                    className="pl-8 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Review Notice */}
          {tile.requires_review && (
            <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-medium">Review Required:</span> This application will be reviewed by municipal staff before approval. 
                Payment will only be processed after approval.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createApplication.isPending}
            >
              {createApplication.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceApplicationModal;