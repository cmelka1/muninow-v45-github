import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BuildingPermitsMunicipalityAutocomplete } from '@/components/ui/building-permits-municipality-autocomplete';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { usePermitTypes, PermitType } from '@/hooks/usePermitTypes';
import { useMunicipalPermitQuestions } from '@/hooks/useMunicipalPermitQuestions';
import { formatCurrency } from '@/lib/formatters';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import { ContractorForm, ContractorInfo } from '@/components/ContractorForm';
import { Plus, Upload, X, FileText, Image, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NewPermitApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedMunicipality {
  id: string;
  merchant_name: string;
  business_name: string;
  customer_city: string;
  customer_state: string;
  customer_id: string;
}

interface SelectedPermitType {
  id: string;
  name: string;
  description: string;
  base_fee_cents: number;
  processing_days: number;
  requires_inspection: boolean;
}

interface PropertyInformation {
  address: string;
  pinNumber: string;
  estimatedValue: number;
}

interface ApplicantInformation {
  nameOrCompany: string;
  phoneNumber: string;
  email: string;
  address: string;
}

interface PropertyOwnerInformation {
  nameOrCompany: string;
  phoneNumber: string;
  email: string;
  address: string;
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

export const NewPermitApplicationDialog: React.FC<NewPermitApplicationDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<SelectedMunicipality | null>(null);
  const [selectedPermitType, setSelectedPermitType] = useState<SelectedPermitType | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInformation>({
    address: '',
    pinNumber: '',
    estimatedValue: 0
  });
  const [applicantInfo, setApplicantInfo] = useState<ApplicantInformation>({
    nameOrCompany: '',
    phoneNumber: '',
    email: '',
    address: ''
  });
  const [useProfileInfo, setUseProfileInfo] = useState(false);
  const [propertyOwnerInfo, setPropertyOwnerInfo] = useState<PropertyOwnerInformation>({
    nameOrCompany: '',
    phoneNumber: '',
    email: '',
    address: ''
  });
  const [sameAsApplicant, setSameAsApplicant] = useState(false);
  const [questionResponses, setQuestionResponses] = useState<Record<string, string | boolean>>({});
  const [contractors, setContractors] = useState<ContractorInfo[]>([
    {
      id: crypto.randomUUID(),
      contractor_type: '',
      contractor_name: '',
      phone: '',
      email: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: ''
    }
  ]);
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const dialogContentRef = useRef<HTMLDivElement>(null);
  
  const { data: permitTypes, isLoading: isLoadingPermitTypes } = usePermitTypes();
  const { toast } = useToast();
  const { data: municipalQuestions, isLoading: isLoadingQuestions } = useMunicipalPermitQuestions(
    selectedMunicipality?.customer_id,
    selectedMunicipality?.id
  );
  const { profile } = useAuth();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep1Fields = () => {
    const errors: Record<string, string> = {};

    if (!selectedMunicipality) errors.municipality = 'Municipality is required';
    if (!selectedPermitType) errors.permitType = 'Permit type is required';
    if (!propertyInfo.address) errors.propertyAddress = 'Property address is required';
    if (!propertyInfo.estimatedValue || propertyInfo.estimatedValue <= 0) errors.estimatedValue = 'Estimated construction value is required';
    if (!applicantInfo.nameOrCompany) errors.applicantName = 'Applicant name/company is required';
    if (!applicantInfo.phoneNumber) errors.applicantPhone = 'Applicant phone number is required';
    if (!applicantInfo.email) errors.applicantEmail = 'Applicant email is required';
    if (!applicantInfo.address) errors.applicantAddress = 'Applicant address is required';
    if (!propertyOwnerInfo.nameOrCompany) errors.ownerName = 'Property owner name/company is required';
    if (!propertyOwnerInfo.phoneNumber) errors.ownerPhone = 'Property owner phone number is required';
    if (!propertyOwnerInfo.email) errors.ownerEmail = 'Property owner email is required';
    if (!propertyOwnerInfo.address) errors.ownerAddress = 'Property owner address is required';

    return errors;
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

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedMunicipality(null);
    setSelectedPermitType(null);
    setPropertyInfo({ address: '', pinNumber: '', estimatedValue: 0 });
    setApplicantInfo({ nameOrCompany: '', phoneNumber: '', email: '', address: '' });
    setUseProfileInfo(false);
    setPropertyOwnerInfo({ nameOrCompany: '', phoneNumber: '', email: '', address: '' });
    setSameAsApplicant(false);
    setQuestionResponses({});
    setContractors([{
      id: crypto.randomUUID(),
      contractor_type: '',
      contractor_name: '',
      phone: '',
      email: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: ''
    }]);
    setScopeOfWork('');
    setUploadedDocuments([]);
    setDragActive(false);
    setIsSubmitting(false);
    setValidationErrors({});
    onOpenChange(false);
  };

  // Validation functions
  const validateRequiredFields = () => {
    const errors: Record<string, string> = {};

    if (!selectedMunicipality) errors.municipality = 'Municipality is required';
    if (!selectedPermitType) errors.permitType = 'Permit type is required';
    if (!propertyInfo.address) errors.propertyAddress = 'Property address is required';
    if (!propertyInfo.estimatedValue || propertyInfo.estimatedValue <= 0) errors.estimatedValue = 'Estimated construction value is required';
    if (!applicantInfo.nameOrCompany) errors.applicantName = 'Applicant name/company is required';
    if (!applicantInfo.phoneNumber) errors.applicantPhone = 'Applicant phone number is required';
    if (!applicantInfo.email) errors.applicantEmail = 'Applicant email is required';
    if (!applicantInfo.address) errors.applicantAddress = 'Applicant address is required';
    if (!propertyOwnerInfo.nameOrCompany) errors.ownerName = 'Property owner name/company is required';
    if (!propertyOwnerInfo.phoneNumber) errors.ownerPhone = 'Property owner phone number is required';
    if (!propertyOwnerInfo.email) errors.ownerEmail = 'Property owner email is required';
    if (!propertyOwnerInfo.address) errors.ownerAddress = 'Property owner address is required';

    // Check required municipal questions
    if (municipalQuestions) {
      for (const question of municipalQuestions) {
        if (question.is_required && !questionResponses[question.id]) {
          errors[`question_${question.id}`] = `Required question "${question.question_text}" must be answered`;
        }
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    if (!profile?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit a permit application.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    const errors = validateRequiredFields();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Show toast only for critical errors
      toast({
        title: "Please complete all required fields",
        description: "Check the highlighted fields below and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      
      // Fetch merchant and fee profile data
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select(`
          *,
          merchant_fee_profiles (
            id,
            finix_fee_profile_id,
            basis_points,
            fixed_fee,
            ach_basis_points,
            ach_fixed_fee
          )
        `)
        .eq('id', selectedMunicipality!.id)
        .single();

      if (merchantError) throw merchantError;

      const feeProfile = merchantData.merchant_fee_profiles?.[0];
      
      // Generate payment identifiers
      const idempotencyId = crypto.randomUUID();
      const fraudSessionId = crypto.randomUUID();
      
      // Calculate payment amount from permit type
      const paymentAmountCents = selectedPermitType!.base_fee_cents;


      // Validate UUID fields before insertion
      const isValidUUID = (str: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Check all UUID fields
      const uuidFields = [
        { name: 'user_id', value: profile.id },
        { name: 'customer_id', value: selectedMunicipality!.customer_id },
        { name: 'merchant_id', value: selectedMunicipality!.id }
      ];

      for (const field of uuidFields) {
        if (!isValidUUID(field.value)) {
          console.error(`Invalid ${field.name} UUID:`, field.value);
          throw new Error(`Invalid ${field.name} UUID format: ${field.value}`);
        }
      }

      // Create the permit application - let the database trigger generate the permit number atomically
      const { data: permitApplication, error: permitError } = await supabase
        .from('permit_applications')
        .insert({
          user_id: profile.id,
          customer_id: selectedMunicipality!.customer_id,
          merchant_id: selectedMunicipality!.id,
          permit_type: selectedPermitType!.name,
          property_address: propertyInfo.address,
          property_pin: propertyInfo.pinNumber || null,
          estimated_construction_value_cents: propertyInfo.estimatedValue * 100,
          applicant_full_name: applicantInfo.nameOrCompany,
          applicant_phone: applicantInfo.phoneNumber,
          applicant_email: applicantInfo.email,
          applicant_address: applicantInfo.address,
          owner_full_name: propertyOwnerInfo.nameOrCompany,
          owner_phone: propertyOwnerInfo.phoneNumber,
          owner_email: propertyOwnerInfo.email,
          owner_address: propertyOwnerInfo.address,
          scope_of_work: scopeOfWork || null,
          municipal_questions_responses: municipalQuestions && municipalQuestions.length > 0 ? questionResponses : null,
          application_status: 'submitted' as const,
          submitted_at: new Date().toISOString(),
          // Merchant data
          merchant_name: merchantData.merchant_name,
          finix_merchant_id: merchantData.finix_merchant_id,
          merchant_finix_identity_id: merchantData.finix_identity_id,
          // Fee profile data
          merchant_fee_profile_id: feeProfile?.id,
          basis_points: feeProfile?.basis_points,
          fixed_fee: feeProfile?.fixed_fee,
          ach_basis_points: feeProfile?.ach_basis_points,
          ach_fixed_fee: feeProfile?.ach_fixed_fee,
          // Payment data
          payment_amount_cents: paymentAmountCents,
          idempotency_id: idempotencyId,
          fraud_session_id: fraudSessionId
        })
        .select()
        .single();

      if (permitError) throw permitError;

      // Insert contractors
      const contractorPromises = contractors
        .filter(contractor => contractor.contractor_type && contractor.contractor_name)
        .map(contractor => 
          supabase.from('permit_contractors').insert({
            permit_id: permitApplication.permit_id,
            contractor_type: contractor.contractor_type,
            contractor_name: contractor.contractor_name,
            contractor_phone: contractor.phone || null,
            contractor_email: contractor.email || null,
            contractor_address: contractor.street_address ? `${contractor.street_address}, ${contractor.city}, ${contractor.state} ${contractor.zip_code}` : null
          })
        );

      await Promise.all(contractorPromises);

      // Link uploaded documents
      const documentPromises = uploadedDocuments
        .filter(doc => doc.uploadStatus === 'completed' && doc.filePath)
        .map(doc => 
          supabase.from('permit_documents').insert({
            permit_id: permitApplication.permit_id,
            user_id: profile.id,
            customer_id: selectedMunicipality!.customer_id,
            merchant_id: selectedMunicipality!.id,
            merchant_name: selectedMunicipality!.merchant_name,
            file_name: doc.name,
            document_type: doc.documentType,
            description: doc.description || null,
            storage_path: doc.filePath!,
            file_size: doc.size,
            content_type: doc.type
          })
        );

      await Promise.all(documentPromises);

      toast({
        title: "Application submitted successfully!",
        description: `Your permit application ${permitApplication.permit_number} has been submitted for review.`,
      });

      handleClose();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "An error occurred while submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMunicipalitySelect = (municipality: SelectedMunicipality) => {
    setSelectedMunicipality(municipality);
    // Reset question responses when municipality changes
    setQuestionResponses({});
  };

  const handlePermitTypeSelect = (permitTypeId: string) => {
    const permitType = permitTypes?.find(pt => pt.id === permitTypeId);
    if (permitType) {
      setSelectedPermitType({
        id: permitType.id,
        name: permitType.name,
        description: permitType.description,
        base_fee_cents: permitType.base_fee_cents,
        processing_days: permitType.processing_days,
        requires_inspection: permitType.requires_inspection,
      });
    }
  };

  const handleAddressSelect = (addressComponents: any) => {
    const fullAddress = `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`;
    setPropertyInfo(prev => ({ ...prev, address: fullAddress }));
  };

  const handlePinNumberChange = (value: string) => {
    setPropertyInfo(prev => ({ ...prev, pinNumber: value }));
  };

  const formatCurrencyInput = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^\d]/g, '');
    // Convert to number and format as currency
    const number = parseInt(numericValue) || 0;
    return number.toLocaleString('en-US');
  };

  const handleEstimatedValueChange = (value: string) => {
    // Remove all non-numeric characters and convert to number
    const numericValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
    setPropertyInfo(prev => ({ ...prev, estimatedValue: numericValue }));
  };

  const handleUseProfileInfoToggle = (checked: boolean) => {
    setUseProfileInfo(checked);
    if (checked && profile) {
      // Populate applicant info with profile data
      const fullName = profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.business_legal_name || '';
      
      const fullAddress = profile.street_address 
        ? `${profile.street_address}${profile.city ? `, ${profile.city}` : ''}${profile.state ? `, ${profile.state}` : ''}${profile.zip_code ? ` ${profile.zip_code}` : ''}`
        : '';

      setApplicantInfo({
        nameOrCompany: fullName,
        phoneNumber: profile.phone ? normalizePhoneInput(profile.phone) : '',
        email: profile.email || '',
        address: fullAddress
      });
      
      // Update property owner info if "same as applicant" is enabled
      if (sameAsApplicant) {
        setPropertyOwnerInfo({
          nameOrCompany: fullName,
          phoneNumber: profile.phone ? normalizePhoneInput(profile.phone) : '',
          email: profile.email || '',
          address: fullAddress
        });
      }
    } else if (!checked) {
      // Clear applicant info when toggled off
      setApplicantInfo({
        nameOrCompany: '',
        phoneNumber: '',
        email: '',
        address: ''
      });
      
      // Clear property owner info if "same as applicant" is enabled
      if (sameAsApplicant) {
        setPropertyOwnerInfo({
          nameOrCompany: '',
          phoneNumber: '',
          email: '',
          address: ''
        });
      }
    }
  };

  const handleApplicantAddressSelect = (addressComponents: any) => {
    const fullAddress = `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`;
    setApplicantInfo(prev => ({ ...prev, address: fullAddress }));
    // Update property owner info if "same as applicant" is enabled
    if (sameAsApplicant) {
      setPropertyOwnerInfo(prev => ({ ...prev, address: fullAddress }));
    }
  };

  const handleSameAsApplicantToggle = (checked: boolean) => {
    setSameAsApplicant(checked);
    if (checked) {
      // Copy all applicant information to property owner fields
      setPropertyOwnerInfo({
        nameOrCompany: applicantInfo.nameOrCompany,
        phoneNumber: applicantInfo.phoneNumber,
        email: applicantInfo.email,
        address: applicantInfo.address
      });
    } else {
      // Clear property owner info when toggled off
      setPropertyOwnerInfo({
        nameOrCompany: '',
        phoneNumber: '',
        email: '',
        address: ''
      });
    }
  };

  const handlePropertyOwnerAddressSelect = (addressComponents: any) => {
    const fullAddress = `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`;
    setPropertyOwnerInfo(prev => ({ ...prev, address: fullAddress }));
  };

  const handleQuestionResponse = (questionId: string, value: string | boolean) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleContractorUpdate = (id: string, field: keyof ContractorInfo, value: string) => {
    setContractors(prev => prev.map(contractor => 
      contractor.id === id ? { ...contractor, [field]: value } : contractor
    ));
  };

  const handleAddContractor = () => {
    const newContractor: ContractorInfo = {
      id: crypto.randomUUID(),
      contractor_type: '',
      contractor_name: '',
      phone: '',
      email: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: ''
    };
    setContractors(prev => [...prev, newContractor]);
  };

  const handleRemoveContractor = (id: string) => {
    setContractors(prev => prev.filter(contractor => contractor.id !== id));
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
    const filePath = `${profile.id}/permits/${documentId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('permit-documents')
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

  const handleDocumentDescriptionChange = (documentId: string, description: string) => {
    setUploadedDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, description } : doc
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

  const renderMunicipalQuestions = () => {
    if (!selectedMunicipality || !municipalQuestions || municipalQuestions.length === 0) {
      return null;
    }

    const sortedQuestions = [...municipalQuestions].sort((a, b) => a.display_order - b.display_order);

    return (
      <div className="space-y-4 mt-6 pt-6 border-t">
        <h4 className="text-sm font-medium text-foreground mb-4">Additional Questions</h4>
        {sortedQuestions.map((question) => (
          <div key={question.id} className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {question.question_text} {question.is_required && <span className="text-destructive">*</span>}
            </Label>
            
            {question.question_type === 'text' && (
              <Input
                placeholder="Enter your response"
                value={(questionResponses[question.id] as string) || ''}
                onChange={(e) => handleQuestionResponse(question.id, e.target.value)}
                className="mt-1"
              />
            )}
            
            {question.question_type === 'checkbox' && (
              <div className="flex items-center space-x-2 mt-1">
                <Switch
                  id={`question-${question.id}`}
                  checked={(questionResponses[question.id] as boolean) || false}
                  onCheckedChange={(checked) => handleQuestionResponse(question.id, checked)}
                />
                <Label htmlFor={`question-${question.id}`} className="text-sm text-muted-foreground">
                  Yes
                </Label>
              </div>
            )}
            
            {question.question_type === 'select' && question.question_options && (
              <Select onValueChange={(value) => handleQuestionResponse(question.id, value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(question.question_options) && question.question_options.map((option: string, index: number) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Permit Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="municipality" className="text-sm font-medium text-foreground">
                      Municipality *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the municipality where your permit will be processed
                    </p>
                    <BuildingPermitsMunicipalityAutocomplete
                      placeholder="Search for your municipality..."
                      onSelect={(municipality) => {
                        handleMunicipalitySelect(municipality);
                        clearFieldError('municipality');
                      }}
                      className={`mt-1 ${validationErrors.municipality ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.municipality}
                    />
                    {validationErrors.municipality && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.municipality}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="permit-type" className="text-sm font-medium text-foreground">
                      Permit Type *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the type of permit you need
                    </p>
                    <Select onValueChange={(value) => {
                      handlePermitTypeSelect(value);
                      clearFieldError('permitType');
                    }} disabled={isLoadingPermitTypes}>
                      <SelectTrigger className={`mt-1 ${validationErrors.permitType ? 'ring-2 ring-destructive border-destructive' : ''}`} data-error={!!validationErrors.permitType}>
                        <SelectValue placeholder={isLoadingPermitTypes ? "Loading permit types..." : "Select a permit type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {permitTypes?.map((permitType) => (
                          <SelectItem key={permitType.id} value={permitType.id}>
                            {permitType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.permitType && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.permitType}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="property-address" className="text-sm font-medium text-foreground">
                      Property Address *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the address where the work will be performed
                    </p>
                    <RestPlacesAutocomplete
                      placeholder="Start typing the property address..."
                      onAddressSelect={(addressComponents) => {
                        handleAddressSelect(addressComponents);
                        clearFieldError('propertyAddress');
                      }}
                      value={propertyInfo.address}
                      onChange={(value) => {
                        setPropertyInfo(prev => ({ ...prev, address: value }));
                        if (value) clearFieldError('propertyAddress');
                      }}
                      className={`mt-1 ${validationErrors.propertyAddress ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.propertyAddress}
                    />
                    {validationErrors.propertyAddress && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.propertyAddress}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="pin-number" className="text-sm font-medium text-foreground">
                      PIN Number <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Parcel Number if available
                    </p>
                    <Input
                      id="pin-number"
                      placeholder="Enter parcel number"
                      value={propertyInfo.pinNumber}
                      onChange={(e) => handlePinNumberChange(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="estimated-value" className="text-sm font-medium text-foreground">
                      Estimated Construction Value *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the estimated cost of construction work
                    </p>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="estimated-value"
                        placeholder="00,000"
                        value={formatCurrencyInput(propertyInfo.estimatedValue.toString())}
                        onChange={(e) => {
                          handleEstimatedValueChange(e.target.value);
                          if (e.target.value) clearFieldError('estimatedValue');
                        }}
                        className={`pl-8 ${validationErrors.estimatedValue ? 'ring-2 ring-destructive border-destructive' : ''}`}
                        data-error={!!validationErrors.estimatedValue}
                      />
                    </div>
                    {validationErrors.estimatedValue && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.estimatedValue}</p>
                    )}
                  </div>
                  
                  {/* Municipal Questions */}
                  {renderMunicipalQuestions()}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Applicant Information
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="use-profile-info" className="text-sm text-muted-foreground">
                    Use Profile Information
                  </Label>
                  <Switch
                    id="use-profile-info"
                    checked={useProfileInfo}
                    onCheckedChange={handleUseProfileInfoToggle}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="applicant-name" className="text-sm font-medium text-foreground">
                      Name/Company *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter your full name or company name
                    </p>
                    <Input
                      id="applicant-name"
                      placeholder="Enter name or company"
                      value={applicantInfo.nameOrCompany}
                      onChange={(e) => {
                        setApplicantInfo(prev => ({ ...prev, nameOrCompany: e.target.value }));
                        if (e.target.value) clearFieldError('applicantName');
                      }}
                      className={`mt-1 ${validationErrors.applicantName ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      disabled={useProfileInfo}
                      data-error={!!validationErrors.applicantName}
                    />
                    {validationErrors.applicantName && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.applicantName}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="applicant-phone" className="text-sm font-medium text-foreground">
                      Phone Number *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter your contact phone number
                    </p>
                    <Input
                      id="applicant-phone"
                      placeholder="(xxx) xxx-xxxx"
                      value={applicantInfo.phoneNumber}
                      onChange={(e) => {
                        const normalized = normalizePhoneInput(e.target.value);
                        setApplicantInfo(prev => ({ ...prev, phoneNumber: normalized }));
                        if (normalized) clearFieldError('applicantPhone');
                      }}
                      className={`mt-1 ${validationErrors.applicantPhone ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      disabled={useProfileInfo}
                      data-error={!!validationErrors.applicantPhone}
                    />
                    {validationErrors.applicantPhone && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.applicantPhone}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="applicant-email" className="text-sm font-medium text-foreground">
                      Email *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter your email address
                    </p>
                    <Input
                      id="applicant-email"
                      type="email"
                      placeholder="Enter email address"
                      value={applicantInfo.email}
                      onChange={(e) => {
                        setApplicantInfo(prev => ({ ...prev, email: e.target.value }));
                        if (e.target.value) clearFieldError('applicantEmail');
                      }}
                      className={`mt-1 ${validationErrors.applicantEmail ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      disabled={useProfileInfo}
                      data-error={!!validationErrors.applicantEmail}
                    />
                    {validationErrors.applicantEmail && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.applicantEmail}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="applicant-address" className="text-sm font-medium text-foreground">
                      Address *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter your mailing address
                    </p>
                    <RestPlacesAutocomplete
                      placeholder="Start typing your address..."
                      onAddressSelect={useProfileInfo ? () => {} : (addressComponents) => {
                        handleApplicantAddressSelect(addressComponents);
                        clearFieldError('applicantAddress');
                      }}
                      value={applicantInfo.address}
                      onChange={useProfileInfo ? () => {} : (value) => {
                        setApplicantInfo(prev => ({ ...prev, address: value }));
                        if (value) clearFieldError('applicantAddress');
                      }}
                      className={`mt-1 ${useProfileInfo ? 'opacity-50 pointer-events-none' : ''} ${validationErrors.applicantAddress ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.applicantAddress}
                    />
                    {validationErrors.applicantAddress && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.applicantAddress}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Property Owner
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="same-as-applicant" className="text-sm text-muted-foreground">
                    Same as Applicant
                  </Label>
                  <Switch
                    id="same-as-applicant"
                    checked={sameAsApplicant}
                    onCheckedChange={handleSameAsApplicantToggle}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="owner-name" className="text-sm font-medium text-foreground">
                      Name/Company *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter property owner's full name or company name
                    </p>
                    <Input
                      id="owner-name"
                      placeholder="Enter name or company"
                      value={propertyOwnerInfo.nameOrCompany}
                      onChange={(e) => {
                        setPropertyOwnerInfo(prev => ({ ...prev, nameOrCompany: e.target.value }));
                        if (e.target.value) clearFieldError('ownerName');
                      }}
                      className={`mt-1 ${validationErrors.ownerName ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      disabled={sameAsApplicant}
                      data-error={!!validationErrors.ownerName}
                    />
                    {validationErrors.ownerName && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.ownerName}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="owner-phone" className="text-sm font-medium text-foreground">
                      Phone Number *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter property owner's contact phone number
                    </p>
                    <Input
                      id="owner-phone"
                      placeholder="(xxx) xxx-xxxx"
                      value={propertyOwnerInfo.phoneNumber}
                      onChange={(e) => {
                        const normalized = normalizePhoneInput(e.target.value);
                        setPropertyOwnerInfo(prev => ({ ...prev, phoneNumber: normalized }));
                        if (normalized) clearFieldError('ownerPhone');
                      }}
                      className={`mt-1 ${validationErrors.ownerPhone ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      disabled={sameAsApplicant}
                      data-error={!!validationErrors.ownerPhone}
                    />
                    {validationErrors.ownerPhone && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.ownerPhone}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="owner-email" className="text-sm font-medium text-foreground">
                      Email *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter property owner's email address
                    </p>
                    <Input
                      id="owner-email"
                      type="email"
                      placeholder="Enter email address"
                      value={propertyOwnerInfo.email}
                      onChange={(e) => {
                        setPropertyOwnerInfo(prev => ({ ...prev, email: e.target.value }));
                        if (e.target.value) clearFieldError('ownerEmail');
                      }}
                      className={`mt-1 ${validationErrors.ownerEmail ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.ownerEmail}
                      disabled={sameAsApplicant}
                    />
                    {validationErrors.ownerEmail && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.ownerEmail}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="owner-address" className="text-sm font-medium text-foreground">
                      Address *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter property owner's mailing address
                    </p>
                    <RestPlacesAutocomplete
                      placeholder="Start typing the address..."
                      onAddressSelect={sameAsApplicant ? () => {} : (addressComponents) => {
                        handlePropertyOwnerAddressSelect(addressComponents);
                        clearFieldError('ownerAddress');
                      }}
                      value={propertyOwnerInfo.address}
                      onChange={sameAsApplicant ? () => {} : (value) => {
                        setPropertyOwnerInfo(prev => ({ ...prev, address: value }));
                        if (value) clearFieldError('ownerAddress');
                      }}
                      className={`mt-1 ${sameAsApplicant ? 'opacity-50 pointer-events-none' : ''} ${validationErrors.ownerAddress ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.ownerAddress}
                    />
                    {validationErrors.ownerAddress && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.ownerAddress}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Contractor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contractors.map((contractor, index) => (
                    <ContractorForm
                      key={contractor.id}
                      contractor={contractor}
                      index={index}
                      onUpdate={handleContractorUpdate}
                      onRemove={handleRemoveContractor}
                      canRemove={contractors.length > 1}
                    />
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddContractor}
                    className="w-full flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Contractor
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Scope of Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="scope-of-work" className="text-sm font-medium text-foreground">
                    Description of Work *
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Provide a detailed description of the work to be performed
                  </p>
                  <RichTextEditor
                    content={scopeOfWork}
                    onChange={setScopeOfWork}
                    placeholder="Enter a detailed description of the construction work, materials to be used, and any other relevant details..."
                    error={!!validationErrors.scopeOfWork}
                    className="mt-1"
                  />
                  {validationErrors.scopeOfWork && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.scopeOfWork}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
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
                      Upload plans, specifications, or other documents related to your permit application
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
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            {/* Review Basic Information */}
            <Card className="animate-fade-in">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Basic Information
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs"
                >
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Municipality</Label>
                    <p className="text-sm font-medium">{selectedMunicipality?.merchant_name || 'Not selected'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Permit Type</Label>
                    <p className="text-sm font-medium">{selectedPermitType?.name || 'Not selected'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Property Address</Label>
                    <p className="text-sm font-medium">{propertyInfo.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estimated Value</Label>
                    <p className="text-sm font-medium">
                      {propertyInfo.estimatedValue ? formatCurrency(propertyInfo.estimatedValue) : 'Not provided'}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Applicant</Label>
                    <p className="text-sm font-medium">{applicantInfo.nameOrCompany || 'Not provided'}</p>
                    <p className="text-xs text-muted-foreground">{applicantInfo.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Property Owner</Label>
                    <p className="text-sm font-medium">{propertyOwnerInfo.nameOrCompany || 'Not provided'}</p>
                    <p className="text-xs text-muted-foreground">{propertyOwnerInfo.email}</p>
                  </div>
                </div>

                {municipalQuestions && municipalQuestions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Additional Questions</Label>
                      <div className="space-y-2 mt-2">
                        {municipalQuestions.map((question) => (
                          <div key={question.id} className="flex justify-between">
                            <span className="text-sm">{question.question_text}</span>
                            <span className="text-sm font-medium">
                              {questionResponses[question.id] ? 'Yes' : 'No'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Review Project Details */}
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Project Details
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs"
                >
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Contractors ({contractors.length})</Label>
                  <div className="space-y-2 mt-2">
                    {contractors.map((contractor, index) => (
                      <div key={contractor.id} className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium">
                          {contractor.contractor_name || `Contractor ${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contractor.contractor_type} • {contractor.email}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Scope of Work</Label>
                  {scopeOfWork ? (
                    <div 
                      className="text-sm mt-1 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1"
                      dangerouslySetInnerHTML={{ __html: scopeOfWork }}
                    />
                  ) : (
                    <p className="text-sm mt-1 text-muted-foreground">Not provided</p>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Documents ({uploadedDocuments.length})</Label>
                  {uploadedDocuments.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {uploadedDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                          {getFileIcon(doc.type)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.documentType} • {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No documents uploaded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent ref={dialogContentRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Permit Application</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-4 pb-6 border-b">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between py-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center space-x-3 ${
                  step <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    step < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step === currentStep
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-medium">
                    {step === 1 && 'Basic Info'}
                    {step === 2 && 'Project Details'}
                    {step === 3 && 'Review & Submit'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px] py-2">
            {renderStepContent()}
          </div>

          {/* Navigation Section */}
          <div className="flex justify-between pt-6 border-t bg-muted/20 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {currentStep < totalSteps ? (
                <Button onClick={handleNext} className="flex items-center space-x-2">
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};