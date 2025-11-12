import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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

import { FileText, Download, User, Copy, ExternalLink, AlertCircle, Upload, X, Image, FileCheck, ArrowLeft, ArrowRight, CheckCircle, Edit, ChevronLeft, ChevronRight, Plus, Info, Loader2, Calendar } from 'lucide-react';
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
import { formatCurrency, formatDate } from '@/lib/formatters';
import { format } from 'date-fns';
import ServiceApplicationReviewStep from './ServiceApplicationReviewStep';
import { TimeSlotBookingStep } from './TimeSlotBookingStep';
import { ReviewAndPaymentStep } from './ReviewAndPaymentStep';
import { useServiceApplicationPaymentMethods } from '@/hooks/useServiceApplicationPaymentMethods';
import { InlinePaymentFlow } from './payment/InlinePaymentFlow';
import { useNavigate } from 'react-router-dom';
import { TimeSlotBooking } from '@/components/TimeSlotBooking';
import { ApplicationFormStep } from '@/components/ApplicationFormStep';
import {
  extractApplicantData,
  mapProfileToFormData,
  initializeFormData,
  prepareSubmissionPayload,
  validateApplicationForm,
  type FormFieldConfig,
} from '@/utils/serviceFormUtils';

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
  const [draftApplicationId, setDraftApplicationId] = useState<string | null>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [useAutoPopulate, setUseAutoPopulate] = useState(false);
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
      
      // Initialize form data using utility functions
      let initialData = initializeFormData(tile.form_fields || []);
      
      // Smart auto-population if enabled
      if (useAutoPopulate && profile && tile.form_fields) {
        const profileData = mapProfileToFormData(profile, tile.form_fields);
        initialData = { ...initialData, ...profileData };
      } else if (!useAutoPopulate) {
        // Preserve existing form data
        tile.form_fields?.forEach(field => {
          if (formData[field.id] !== undefined) {
            initialData[field.id] = formData[field.id];
          }
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
    
    return validateApplicationForm(formData, tile.form_fields || [], {
      requiresDocumentUpload: tile.requires_document_upload,
      uploadedDocuments,
      allowUserDefinedAmount: tile.allow_user_defined_amount,
    });
  };

  // Memoize validation result to avoid redundant calculations
  const validationResult = React.useMemo(() => {
    return validateStep1Fields();
  }, [tile, formData]);

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
      // Validate form fields
      if (Object.keys(validationResult).length > 0) {
        setValidationErrors(validationResult);
        toast({
          title: "Please complete required fields",
          description: "Check the highlighted fields and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate document upload if required
      if (tile?.requires_document_upload && uploadedDocuments.length === 0) {
        toast({
          title: "Documents Required",
          description: "Please upload at least one document before proceeding.",
          variant: "destructive",
        });
        return;
      }
      
      // For non-reviewable services, create draft application after validation
      if (!tile?.requires_review && !draftApplicationId) {
        try {
          const applicantData = extractApplicantData(formData);
          const draftApplication = await createApplication.mutateAsync({
            tile_id: tile.id,
            user_id: profile?.id || '',
            customer_id: tile.customer_id,
            status: 'draft',
            payment_status: 'unpaid',
            base_amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
            ...applicantData,
            service_specific_data: formData,
          });
          setDraftApplicationId(draftApplication.id);
          console.log('✅ Draft application created (will be submitted after payment):', draftApplication.id);
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

      // Save booking data to database using RPC function
      try {
        // Calculate end time based on booking mode
        let endTime: string | null = null;
        if (tile.booking_mode === 'time_period' && tile.time_slot_config?.slot_duration_minutes) {
          const [hours, minutes] = selectedTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + tile.time_slot_config.slot_duration_minutes;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc('create_booking_with_conflict_check', {
          p_application_id: draftApplicationId || null,
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
            ...extractApplicantData(formData),
          },
        });

        // Check for Postgres errors
        if (rpcError) {
          throw rpcError;
        }

        // Parse TABLE response - RPC returns array of rows
        type BookingRow = { application_id: string | null; conflict: boolean; message: string };
        const rows = (rpcData as BookingRow[]) || [];
        const row = rows[0];

        if (!row) {
          throw new Error('No response from booking RPC');
        }

        // Check for booking conflicts
        if (row.conflict) {
          toast({
            title: 'Time Slot Unavailable',
            description: row.message || 'This time slot was just booked by someone else. Please select a different time.',
            variant: 'destructive',
          });
          return; // Don't advance to next step
        }

        // Store the application ID (either newly created or updated draft)
        if (row.application_id) {
          setDraftApplicationId(row.application_id);
          console.log('✅ Booking data saved to application:', row.application_id);
        }
      } catch (error) {
        console.error('Error saving booking data:', error);
        toast({
          title: "Booking Error",
          description: "Failed to save your time slot selection. Please try again.",
          variant: "destructive",
        });
        return; // Don't advance to next step
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
      
      // PRIORITY 1: For services with time slots, use RPC function for atomic booking
      // For non-reviewable services, booking data should already be saved from Step 2->3 transition
      // For reviewable services, we need to call the RPC here
      if (tile.has_time_slots && selectedDate && selectedTime && tile.requires_review) {
        // Calculate end time based on booking mode
        let endTime: string | null = null;
        if (tile.booking_mode === 'time_period' && tile.time_slot_config?.slot_duration_minutes) {
          const [hours, minutes] = selectedTime.split(':').map(Number);
          const startMinutes = hours * 60 + minutes;
          const endMinutes = startMinutes + tile.time_slot_config.slot_duration_minutes;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc('create_booking_with_conflict_check', {
          p_application_id: draftApplicationId || null,  // Pass draft ID if exists
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
            ...extractApplicantData(formData),
          },
        });

        // Check for Postgres errors first
        if (rpcError) {
          throw rpcError;
        }

        // Parse TABLE response - RPC returns array of rows
        type BookingRow = { application_id: string | null; conflict: boolean; message: string };
        const rows = (rpcData as BookingRow[]) || [];
        const row = rows[0];

        if (!row) {
          throw new Error('No response from booking RPC');
        }

        // Check for booking conflicts
        if (row.conflict) {
          toast({
            title: 'Time Slot Unavailable',
            description: row.message || 'This time slot was just booked by someone else. Please select a different time.',
            variant: 'destructive',
          });
          setCurrentStep(2); // Go back to booking step
          setIsSubmitting(false);
          return;
        }

        applicationData = { id: row.application_id! };
      }
      // For non-reviewable services with time slots, booking data already saved in Step 2->3 transition
      else if (tile.has_time_slots && draftApplicationId) {
        applicationData = { id: draftApplicationId };
      }
      // PRIORITY 2: For non-reviewable services with existing draft (non-time-slot only)
      else if (!tile.requires_review && draftApplicationId) {
        const applicantData = extractApplicantData(formData);
        applicationData = await updateApplication.mutateAsync({
          id: draftApplicationId,
          status: 'draft',
          payment_status: 'unpaid',
          ...applicantData,
          additional_information: formData.additional_information || formData.notes || formData.comments || undefined,
          service_specific_data: formData,
        });
      }
      // PRIORITY 3: For reviewable services, create new application
      else {
        const applicantData = extractApplicantData(formData);
        applicationData = await createApplication.mutateAsync({
          tile_id: tile.id,
          user_id: profile?.id || '',
          customer_id: tile.customer_id,
          status: 'submitted',
          payment_status: !tile.requires_payment 
            ? 'not_required' 
            : (tile.requires_review ? 'pending' : 'unpaid'),
          submitted_at: new Date().toISOString(),
          base_amount_cents: tile.allow_user_defined_amount ? formData.amount_cents : tile.amount_cents,
          ...applicantData,
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
            (currentStep === 1 && (Object.keys(validationResult).length > 0 || (tile.requires_document_upload && uploadedDocuments.length === 0))) ||
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
          <ApplicationFormStep
            tile={tile}
            formData={formData}
            onFormDataChange={setFormData}
            uploadedDocuments={uploadedDocuments}
            onDocumentsChange={setUploadedDocuments}
            validationErrors={validationErrors}
            onValidationErrorsChange={setValidationErrors}
            useAutoPopulate={useAutoPopulate}
            onAutoPopulateChange={setUseAutoPopulate}
            onNext={handleNext}
            onClose={onClose}
            isSubmitting={isSubmitting}
            userId={profile?.id}
          />
        ) : currentStep === 2 && tile.has_time_slots ? (
          /* Time Slot Booking Step */
          <TimeSlotBookingStep
            tile={tile}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onDateSelect={setSelectedDate}
            onTimeSelect={setSelectedTime}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        ) : (
          /* Review Step */
          <ReviewAndPaymentStep
            tile={tile}
            formData={formData}
            uploadedDocuments={uploadedDocuments}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            baseAmountCents={baseAmountCents}
            draftApplicationId={draftApplicationId}
            isSubmitting={isSubmitting}
            totalAmount={totalAmount}
            onEdit={() => setCurrentStep(1)}
            onPrevious={handlePrevious}
            onClose={onClose}
            onSubmitApplication={handleSubmitApplication}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onAddPaymentMethod={() => setIsAddPaymentMethodOpen(true)}
            onLoadPaymentInstruments={loadPaymentInstruments}
          />
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