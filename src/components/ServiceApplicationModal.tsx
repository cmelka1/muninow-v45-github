import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { KeyboardNavigationForm } from '@/components/ui/keyboard-navigation-form';
import { FileText, Download, User, Copy, ExternalLink, AlertCircle, Upload, X, Image, FileCheck, ArrowLeft, ArrowRight, CheckCircle, Edit, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { useCreateServiceApplication } from '@/hooks/useServiceApplications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PaymentSummary from './PaymentSummary';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentButtonsContainer from './PaymentButtonsContainer';
import { AddPaymentMethodDialog } from './profile/AddPaymentMethodDialog';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { useServiceApplicationPaymentMethods } from '@/hooks/useServiceApplicationPaymentMethods';
import { formatCurrency } from '@/lib/formatters';
import ServiceApplicationReviewStep from './ServiceApplicationReviewStep';

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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [useAutoPopulate, setUseAutoPopulate] = useState(true);
  const [pdfAccessBlocked, setPdfAccessBlocked] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const totalSteps = 2;
  const progress = (currentStep / totalSteps) * 100;
  
  const { profile } = useAuth();
  const createApplication = useCreateServiceApplication();
  const {
    paymentInstruments,
    isLoading: paymentMethodsLoading,
    loadPaymentInstruments,
  } = useUserPaymentInstruments();

  // Get user-defined amount from form data for fee calculation
  const userDefinedAmount = tile?.allow_user_defined_amount ? formData.amount_cents / 100 : undefined;
  
  // Use the service application payment hook for fee calculations
  const {
    serviceFee,
    totalWithFee,
    baseAmount,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handlePayment: handleServicePayment,
    merchantFeeProfile,
  } = useServiceApplicationPaymentMethods(tile, userDefinedAmount);

  useEffect(() => {
    if (tile && isOpen) {
      // Reset state when modal opens
      setCurrentStep(1);
      setSelectedPaymentMethod(null);
      setIsSubmitting(false);
      setUploadedDocuments([]);
      setValidationErrors({});
      
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
      
      // Load payment instruments if this service doesn't require review
      if (!tile.requires_review) {
        loadPaymentInstruments();
      }
    }
  }, [tile, isOpen, useAutoPopulate, profile]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    // Clear field error when user starts typing
    clearFieldError(fieldId);
  };

  const validateStep1Fields = () => {
    if (!tile) return {};
    
    const errors: Record<string, string> = {};

    // Validate required fields
    tile.form_fields?.forEach(field => {
      if (field.required && (!formData[field.id] || formData[field.id] === '')) {
        errors[field.id] = `${field.label} is required`;
      }
    });

    // Add amount validation for user-defined amounts
    if (tile.allow_user_defined_amount && (!formData.amount_cents || formData.amount_cents <= 0)) {
      errors.amount_cents = 'Service Fee Amount is required';
    }

    return errors;
  };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1 mandatory fields before proceeding
      const errors = validateStep1Fields();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        // Scroll to first error field
        const firstErrorField = document.querySelector(`[data-error="true"]`);
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      } else {
        setValidationErrors({});
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Scroll to top of dialog content
      if (dialogContentRef.current) {
        dialogContentRef.current.scrollTop = 0;
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Scroll to top of dialog content
      if (dialogContentRef.current) {
        dialogContentRef.current.scrollTop = 0;
      }
    }
  };

  const handleSubmitApplication = async () => {
    if (!tile || isSubmitting) return;

    setIsSubmitting(true);

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
      
      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted for review.',
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!tile || !selectedPaymentMethod || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      console.log('Starting payment process for tile:', tile.id);
      
      // First create the application
      const applicationData = await createApplication.mutateAsync({
        tile_id: tile.id,
        user_id: profile?.id || '',
        customer_id: tile.customer_id,
        form_data: formData,
        status: 'draft',
        amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
      });

      console.log('Application created successfully:', applicationData.id);

      // Link uploaded documents to the application
      if (uploadedDocuments.length > 0) {
        try {
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
          console.log('Documents linked successfully');
        } catch (docError) {
          console.error('Error linking documents:', docError);
          // Continue with payment even if document linking fails
        }
      }

      // Process payment using the hook
      console.log('Processing payment for application:', applicationData.id);
      const paymentResult = await handleServicePayment(applicationData.id);
      
      if (paymentResult?.success) {
        console.log('Payment successful, closing modal');
        onClose();
        // Refresh the page or navigate to show updated status
        window.location.reload();
      } else {
        console.error('Payment failed:', paymentResult);
        // Payment hook already shows error toast, but ensure we don't leave modal in loading state
        if (!paymentResult?.retryable) {
          toast({
            title: "Payment Failed",
            description: paymentResult?.error || "Payment could not be processed. Please try again.",
            variant: "destructive",
          });
        }
      }
      
    } catch (error) {
      console.error('Error during payment process:', error);
      
      // Classify the error for better user feedback
      const errorMessage = error instanceof Error 
        ? error.message 
        : "An unexpected error occurred during payment processing.";
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
            data-error={validationErrors[id] ? "true" : "false"}
            className={validationErrors[id] ? "border-destructive" : ""}
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

  const totalAmount = tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent ref={dialogContentRef} className="max-w-4xl max-h-[90vh] overflow-y-auto p-8">
        <KeyboardNavigationForm
          onNext={currentStep === 1 ? handleNext : undefined}
          onSubmit={currentStep === 2 ? (tile.requires_review ? handleSubmitApplication : handlePayment) : undefined}
          onPrevious={currentStep === 2 ? handlePrevious : undefined}
          isNextDisabled={currentStep === 1 && Object.keys(validateStep1Fields()).length > 0}
          isSubmitDisabled={isSubmitting || (currentStep === 2 && !tile.requires_review && !selectedPaymentMethod)}
          currentStep={currentStep}
          totalSteps={2}
        >
        <DialogHeader className="space-y-4 pb-6 border-b">
          <div className="space-y-3">
            <DialogTitle className="text-xl font-semibold">
              {tile.title}
            </DialogTitle>
            
            {/* Progress indicator */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Step {currentStep} of {totalSteps}</span>
                <span className="text-muted-foreground">
                  {currentStep === 1 ? 'Application Details' : 'Review & Submit'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {totalAmount > 0 && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {formatCurrency(totalAmount / 100)}
                </Badge>
              )}
            </div>
          </div>
          
          <DialogDescription className="text-base leading-relaxed">
            {currentStep === 1 ? tile.description : 'Review your application details before submitting'}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 ? (
          <>
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

            <div className="space-y-8 pt-6">
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

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex items-center gap-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Review Step */
          <>
            <ServiceApplicationReviewStep
              tile={tile}
              formData={formData}
              uploadedDocuments={uploadedDocuments}
              onEdit={() => setCurrentStep(1)}
            />
            
            {/* Conditional Payment or Submit Section */}
            {!tile.requires_review ? (
              /* Payment Section for Auto-Approve Services */
              <>
                <div className="space-y-6">
                  {totalAmount > 0 && (
                    <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          Payment Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                       <PaymentSummary 
                          baseAmount={baseAmount}
                          serviceFee={serviceFee}
                          selectedPaymentMethod={selectedPaymentMethod}
                          compact={true}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Separator */}
                  {totalAmount > 0 && <div className="border-t border-border"></div>}

                  {/* Payment Method Selection */}
                  <Card className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <PaymentMethodSelector
                        paymentInstruments={paymentInstruments.slice(0, 3)}
                        selectedPaymentMethod={selectedPaymentMethod}
                        onSelectPaymentMethod={setSelectedPaymentMethod}
                        isLoading={paymentMethodsLoading}
                        maxMethods={3}
                      />

                       {/* Show message when alternative payment methods are not available */}
                       <div className="text-sm text-muted-foreground text-center py-2">
                         Alternative payment methods are not available for this service.
                       </div>
                    </CardContent>
                  </Card>

                  {/* Separator */}
                  <div className="border-t border-border"></div>

                  {/* Pay Now Section */}
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      size="lg"
                      disabled={!selectedPaymentMethod || isSubmitting}
                      onClick={handlePayment}
                    >
                      {isSubmitting ? 'Processing...' : totalWithFee > 0 ? `Pay ${formatCurrency(totalWithFee / 100)}` : 'Submit Application'}
                    </Button>
                   
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="lg"
                      onClick={() => setIsAddPaymentMethodOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Payment Method
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Your payment will be processed securely
                    </p>
                  </div>
                </div>

                {/* Navigation Actions */}
                <div className="flex justify-between pt-6 border-t bg-muted/20 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePrevious}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    className="flex items-center gap-2"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              /* Submit Section for Manual Review Services */
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <p>Your application will be submitted for manual review by municipal staff.</p>
                      {totalAmount > 0 && (
                        <p>Payment will be processed after your application is approved.</p>
                      )}
                      <p>You will receive notifications about your application status via email.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation & Submit Actions */}
                <div className="flex justify-between pt-6 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePrevious}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleSubmitApplication}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Application'}
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <AddPaymentMethodDialog
          open={isAddPaymentMethodOpen}
          onOpenChange={setIsAddPaymentMethodOpen}
          onSuccess={loadPaymentInstruments}
        />
        </KeyboardNavigationForm>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceApplicationModal;