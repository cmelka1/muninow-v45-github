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
import { useCreateServiceApplication, useUpdateServiceApplication } from '@/hooks/useServiceApplications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InlinePaymentSummary } from './payment/InlinePaymentSummary';
import PaymentMethodSelector from './PaymentMethodSelector';

import { AddPaymentMethodDialog } from './profile/AddPaymentMethodDialog';
import { useUserPaymentInstruments } from '@/hooks/useUserPaymentInstruments';
import { UnifiedPaymentDialog } from '@/components/unified/UnifiedPaymentDialog';
import { formatCurrency } from '@/lib/formatters';
import ServiceApplicationReviewStep from './ServiceApplicationReviewStep';
import { useServiceApplicationPaymentMethods } from '@/hooks/useServiceApplicationPaymentMethods';
import { InlinePaymentFlow } from './payment/InlinePaymentFlow';
import { useNavigate } from 'react-router-dom';
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { TimeSlotBooking } from '@/components/TimeSlotBooking';

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

// Address field detection helper
const ADDRESS_FIELD_IDS = [
  'address', 'full_address', 'street_address', 'street',
  'property_address', 'business_address', 'location'
];

const isAddressField = (fieldId: string): boolean => {
  return ADDRESS_FIELD_IDS.some(id => 
    fieldId.toLowerCase().includes(id.toLowerCase())
  );
};

const ServiceApplicationModal: React.FC<ServiceApplicationModalProps> = ({
  tile,
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [draftApplicationId, setDraftApplicationId] = useState<string | null>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [useAutoPopulate, setUseAutoPopulate] = useState(true);
  const [pdfAccessBlocked, setPdfAccessBlocked] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const totalSteps = tile?.has_time_slots ? 3 : 2;
  const progress = (currentStep / totalSteps) * 100;
  
  const { profile } = useAuth();
  const navigate = useNavigate();
  const createApplication = useCreateServiceApplication();
  const updateApplication = useUpdateServiceApplication();
  const {
    paymentInstruments,
    isLoading: paymentMethodsLoading,
    loadPaymentInstruments,
  } = useUserPaymentInstruments();

  // For modal, we'll use the service application submission with payment redirect
  const baseAmountCents = tile?.allow_user_defined_amount ? formData.amount_cents : tile?.amount_cents || 0;

  // Prepare application data for payment hook (non-reviewed services only)
  const applicationData = tile && !tile.requires_review ? {
    tile_id: tile.id,
    customer_id: tile.customer_id,
    merchant_id: tile.merchant_id,
    user_id: profile?.id || '',
    form_data: formData,
    documents: uploadedDocuments,
    base_amount_cents: baseAmountCents,
  } : null;

  // Initialize payment methods hook for non-reviewed services
  const servicePaymentMethods = useServiceApplicationPaymentMethods(
    applicationData,
    draftApplicationId || undefined
  );

  useEffect(() => {
    if (tile && isOpen) {
      // Reset state when modal opens
      setCurrentStep(1);
      // Reset payment state when modal opens
      setIsSubmitting(false);
      setUploadedDocuments([]);
      setValidationErrors({});
      setSelectedDate(undefined);
      setSelectedTime('');
      
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
        servicePaymentMethods.loadPaymentInstruments();
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

  const handleAddressAutocompleteSelect = (
    fieldId: string,
    addressComponents: {
      streetAddress: string;
      city: string;
      state: string;
      zipCode: string;
    }
  ) => {
    // Create full address string (matching Permits and Business Licenses behavior)
    const fullAddress = `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`;
    
    // Update the address field with the full address
    setFormData(prev => ({
      ...prev,
      [fieldId]: fullAddress
    }));

    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
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

  const handleNext = async () => {
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

      // For non-reviewable services, create draft application after validation
      if (!tile?.requires_review && !draftApplicationId) {
        try {
          const draftApplication = await createApplication.mutateAsync({
            tile_id: tile.id,
            user_id: profile?.id || '',
            customer_id: tile.customer_id,
            status: 'draft',
            payment_status: 'unpaid',
            base_amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
            applicant_name: formData.name || formData.full_name || `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || undefined,
            applicant_email: formData.email || undefined,
            applicant_phone: formData.phone || formData.phone_number || undefined,
            business_legal_name: formData.business_name || formData.business_legal_name || formData.company_name || undefined,
            street_address: formData.address || formData.street_address || formData.street || undefined,
            apt_number: formData.apt || formData.apt_number || formData.apartment || undefined,
            city: formData.city || undefined,
            state: formData.state || undefined,
            zip_code: formData.zip || formData.zip_code || formData.postal_code || undefined,
            service_specific_data: formData,
          });
          setDraftApplicationId(draftApplication.id);
          console.log('✅ Draft application created:', draftApplication.id);
        } catch (error) {
          console.error('Error creating draft application:', error);
          toast({
            title: "Error",
            description: "Failed to create application draft. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }
    } else if (currentStep === 2 && tile?.has_time_slots) {
      // Validate booking step
      if (!selectedDate || !selectedTime) {
        toast({
          title: "Selection Required",
          description: "Please select both a date and time slot.",
          variant: "destructive",
        });
        return;
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
      let applicationData;
      
      // For services with time slots, use RPC function for atomic booking
      if (tile.has_time_slots && selectedDate && selectedTime) {
        // Calculate end time based on booking mode
        let endTime = '';
        if (tile.booking_mode === 'time_period' && tile.time_slot_config?.slot_duration_minutes) {
          const [hours, minutes] = selectedTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + tile.time_slot_config.slot_duration_minutes;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc('create_booking_with_conflict_check', {
          p_tile_id: tile.id,
          p_user_id: profile?.id || '',
          p_customer_id: tile.customer_id,
          p_booking_date: selectedDate.toISOString().split('T')[0],
          p_booking_start_time: selectedTime,
          p_booking_end_time: endTime,
          p_booking_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          p_amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
          p_form_data: {
            ...formData,
            applicant_name: formData.name || formData.full_name || `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || null,
            applicant_email: formData.email || null,
            applicant_phone: formData.phone || formData.phone_number || null,
            business_legal_name: formData.business_name || formData.business_legal_name || formData.company_name || null,
            street_address: formData.address || formData.street_address || formData.street || null,
            apt_number: formData.apt || formData.apt_number || formData.apartment || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zip || formData.zip_code || formData.postal_code || null,
          },
        });

        if (rpcError) {
          if (rpcError.message?.includes('conflict')) {
            toast({
              title: 'Time Slot Unavailable',
              description: 'This time slot was just booked by someone else. Please select a different time.',
              variant: 'destructive',
            });
            setCurrentStep(2); // Go back to booking step
            setIsSubmitting(false);
            return;
          }
          throw rpcError;
        }

        applicationData = { id: rpcData };
      }
      // For non-reviewable services with existing draft, update it
      else if (!tile.requires_review && draftApplicationId) {
        applicationData = await updateApplication.mutateAsync({
          id: draftApplicationId,
          status: 'submitted',
          payment_status: 'unpaid',
          applicant_name: formData.name || formData.full_name || `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || undefined,
          applicant_email: formData.email || undefined,
          applicant_phone: formData.phone || formData.phone_number || undefined,
          business_legal_name: formData.business_name || formData.business_legal_name || formData.company_name || undefined,
          street_address: formData.address || formData.street_address || formData.street || undefined,
          apt_number: formData.apt || formData.apt_number || formData.apartment || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip_code: formData.zip || formData.zip_code || formData.postal_code || undefined,
          additional_information: formData.additional_information || formData.notes || formData.comments || undefined,
          service_specific_data: formData,
        });
      } else {
        // For reviewable services, create new application
        applicationData = await createApplication.mutateAsync({
          tile_id: tile.id,
          user_id: profile?.id || '',
          customer_id: tile.customer_id,
          status: 'submitted',
          payment_status: tile.requires_review ? 'not_required' : 'unpaid',
          base_amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
          applicant_name: formData.name || formData.full_name || `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || undefined,
          applicant_email: formData.email || undefined,
          applicant_phone: formData.phone || formData.phone_number || undefined,
          business_legal_name: formData.business_name || formData.business_legal_name || formData.company_name || undefined,
          street_address: formData.address || formData.street_address || formData.street || undefined,
          apt_number: formData.apt || formData.apt_number || formData.apartment || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip_code: formData.zip || formData.zip_code || formData.postal_code || undefined,
          additional_information: formData.additional_information || formData.notes || formData.comments || undefined,
          service_specific_data: formData,
        });
      }

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

  const handlePaymentSuccess = (response: any) => {
    console.log('✅ Service application payment successful:', response);
    toast({
      title: 'Application Submitted',
      description: 'Your service application has been submitted and paid successfully.',
    });
    onClose();
    navigate('/dashboard');
  };

  const handlePaymentError = (error: any) => {
    console.error('❌ Service application payment failed:', error);
    toast({
      title: 'Payment Failed',
      description: error?.message || 'Failed to process payment',
      variant: 'destructive',
    });
  };

  const renderFormField = (field: any) => {
    const { id, label, type, options, required, placeholder } = field;
    
    // Use Google Places Autocomplete for address fields
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
          onNext={currentStep < totalSteps ? handleNext : undefined}
          onSubmit={currentStep === totalSteps && tile.requires_review ? handleSubmitApplication : undefined}
          onPrevious={currentStep > 1 ? handlePrevious : undefined}
          isNextDisabled={
            (currentStep === 1 && Object.keys(validateStep1Fields()).length > 0) ||
            (currentStep === 2 && tile.has_time_slots && (!selectedDate || !selectedTime))
          }
          isSubmitDisabled={isSubmitting}
          currentStep={currentStep}
          totalSteps={totalSteps}
        >
        <DialogHeader className="space-y-4 pb-6">
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
                  {currentStep === 1 
                    ? 'Application Details' 
                    : tile.has_time_slots && currentStep === 2
                    ? 'Select Time Slot'
                    : 'Review & Submit'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {totalAmount > 0 && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {formatCurrency(totalAmount)}
                </Badge>
              )}
            </div>
          </div>
          
          <DialogDescription className="text-base leading-relaxed">
            {currentStep === 1 ? tile.description : ''}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 ? (
          <>
            {/* Guidance Text Box */}
...
          </>
        ) : currentStep === 2 && tile.has_time_slots ? (
          /* Time Slot Booking Step */
          <>
            <TimeSlotBooking
              tile={tile}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateSelect={setSelectedDate}
              onTimeSelect={setSelectedTime}
            />
            
            <div className="flex justify-between pt-6">
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
                onClick={handleNext}
                disabled={!selectedDate || !selectedTime}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
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
              <div className="mt-8 space-y-6">
                {/* Payment Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Complete Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InlinePaymentFlow
                      entityType="service_application"
                      entityId={draftApplicationId || ''}
                      entityName={tile.title}
                      customerId={tile.customer_id}
                      merchantId={tile.merchant_id}
                      baseAmountCents={baseAmountCents}
                      initialExpanded={true}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      onAddPaymentMethod={() => setIsAddPaymentMethodOpen(true)}
                    />
                  </CardContent>
                </Card>

                {/* Navigation Actions */}
                <div className="flex justify-between pt-6 bg-muted/20 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
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
              </div>
            ) : (
              /* Submit Section for Manual Review Services */
              <>
                <Card className="mt-8">
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
                <div className="flex justify-between pt-6">
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