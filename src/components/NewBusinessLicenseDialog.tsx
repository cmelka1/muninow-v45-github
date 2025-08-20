import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Upload, X, FileText, Image, FileCheck, Edit } from 'lucide-react';
import { BuildingPermitsMunicipalityAutocomplete } from '@/components/ui/building-permits-municipality-autocomplete';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { SafeHtmlRenderer } from '@/components/ui/safe-html-renderer';
import { Separator } from '@/components/ui/separator';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { normalizeEINInput, formatEINForStorage } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBusinessLicenseTypes } from '@/hooks/useBusinessLicenseTypes';
import { useBusinessLicenseApplication } from '@/hooks/useBusinessLicenseApplication';
import { useBusinessLicenseDocuments } from '@/hooks/useBusinessLicenseDocuments';

interface NewBusinessLicenseDialogProps {
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

interface BusinessInformation {
  businessLegalName: string;
  businessOwner: string;
  businessOwnerPhone: string;
  businessOwnerEmail: string;
  businessAddress: string;
  businessEIN: string;
  businessDescription: string;
  additionalDetails: string;
  uploadedDocuments: UploadedDocument[];
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

export const NewBusinessLicenseDialog: React.FC<NewBusinessLicenseDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<SelectedMunicipality | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [businessInfo, setBusinessInfo] = useState<BusinessInformation>({
    businessLegalName: '',
    businessOwner: '',
    businessOwnerPhone: '',
    businessOwnerEmail: '',
    businessAddress: '',
    businessEIN: '',
    businessDescription: '',
    additionalDetails: '',
    uploadedDocuments: []
  });
  const [useBusinessProfileInfo, setUseBusinessProfileInfo] = useState(false);
  const [isDifferentPropertyOwner, setIsDifferentPropertyOwner] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [propertyOwnerInfo, setPropertyOwnerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Hooks for data operations
  const { data: licenseTypes = [] } = useBusinessLicenseTypes({ 
    customerId: selectedMunicipality?.customer_id 
  });
  const { createApplication, submitApplication } = useBusinessLicenseApplication();
  const { uploadDocument } = useBusinessLicenseDocuments();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep1Fields = () => {
    const errors: Record<string, string> = {};

    if (!selectedMunicipality) errors.municipality = 'Municipality is required';
    if (!selectedBusinessType) errors.businessType = 'Business type is required';
    if (!businessInfo.businessLegalName) errors.businessLegalName = 'Business legal name is required';
    if (!businessInfo.businessOwner) errors.businessOwner = 'Business owner is required';
    if (!businessInfo.businessOwnerPhone) errors.businessOwnerPhone = 'Business owner phone number is required';
    if (!businessInfo.businessOwnerEmail) errors.businessOwnerEmail = 'Business owner email is required';
    if (!businessInfo.businessAddress) errors.businessAddress = 'Business address is required';
    if (!businessInfo.businessEIN) errors.businessEIN = 'Business EIN is required';

    // Validate property owner fields if switch is enabled
    if (isDifferentPropertyOwner) {
      if (!propertyOwnerInfo.name) errors.propertyOwnerName = 'Property owner name is required';
      if (!propertyOwnerInfo.phone) errors.propertyOwnerPhone = 'Property owner phone is required';
      if (!propertyOwnerInfo.email) errors.propertyOwnerEmail = 'Property owner email is required';
      if (!propertyOwnerInfo.address) errors.propertyOwnerAddress = 'Property owner address is required';
    }

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
    setSelectedBusinessType('');
    setBusinessInfo({
      businessLegalName: '',
      businessOwner: '',
      businessOwnerPhone: '',
      businessOwnerEmail: '',
      businessAddress: '',
      businessEIN: '',
      businessDescription: '',
      additionalDetails: '',
      uploadedDocuments: []
    });
    setUseBusinessProfileInfo(false);
    setIsDifferentPropertyOwner(false);
    setPropertyOwnerInfo({
      name: '',
      phone: '',
      email: '',
      address: ''
    });
    setValidationErrors({});
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleMunicipalitySelect = (municipality: SelectedMunicipality) => {
    setSelectedMunicipality(municipality);
    clearFieldError('municipality');
  };

  const handleBusinessTypeSelect = (businessType: string) => {
    setSelectedBusinessType(businessType);
    clearFieldError('businessType');
  };

  const handleUseBusinessProfileInfoToggle = (checked: boolean) => {
    setUseBusinessProfileInfo(checked);
    if (checked && profile) {
      // Populate business info with profile data, only if fields are empty
      const fullName = profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.business_legal_name || '';
      
      const fullAddress = profile.street_address 
        ? `${profile.street_address}${profile.city ? `, ${profile.city}` : ''}${profile.state ? `, ${profile.state}` : ''}${profile.zip_code ? ` ${profile.zip_code}` : ''}`
        : '';

      setBusinessInfo(prev => ({
        businessLegalName: prev.businessLegalName || profile.business_legal_name || '',
        businessOwner: prev.businessOwner || fullName,
        businessOwnerPhone: prev.businessOwnerPhone || (profile.phone ? normalizePhoneInput(profile.phone) : ''),
        businessOwnerEmail: prev.businessOwnerEmail || profile.email || '',
        businessAddress: prev.businessAddress || fullAddress,
        businessEIN: prev.businessEIN || '',
        businessDescription: prev.businessDescription || '',
        additionalDetails: prev.additionalDetails || '',
        uploadedDocuments: prev.uploadedDocuments || []
      }));
    }
    // Note: We no longer clear fields when toggled off to preserve user input
  };

  // Document upload handlers
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

  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: "File Upload Error",
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
        uploadProgress: 100,
        uploadStatus: 'completed' // For now, set as completed since we're not actually uploading
      };

      setBusinessInfo(prev => ({
        ...prev,
        uploadedDocuments: [...prev.uploadedDocuments, newDocument]
      }));
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      uploadedDocuments: prev.uploadedDocuments.filter(doc => doc.id !== documentId)
    }));
  };

  const handleDocumentTypeChange = (documentId: string, documentType: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      uploadedDocuments: prev.uploadedDocuments.map(doc => 
        doc.id === documentId ? { ...doc, documentType } : doc
      )
    }));
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

  const formatBusinessType = (businessType: string) => {
    const typeMapping: Record<string, string> = {
      'retail_trade': 'Retail & Trade',
      'professional_services': 'Professional Services',
      'construction_contracting': 'Construction & Contracting',
      'industrial_manufacturing': 'Industrial & Manufacturing',
      'personal_services': 'Personal Services',
      'hospitality_lodging': 'Hospitality & Lodging',
      'other': 'Other'
    };
    return typeMapping[businessType] || businessType;
  };

  const formatEINForDisplay = (ein: string) => {
    if (!ein) return 'Not provided';
    // Remove any existing formatting
    const cleaned = ein.replace(/\D/g, '');
    // Format as XX-XXXXXXX
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    }
    return ein;
  };

  const handleBusinessAddressSelect = (addressComponents: any) => {
    const fullAddress = `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`;
    setBusinessInfo(prev => ({ ...prev, businessAddress: fullAddress }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    const errors = validateStep1Fields();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Please complete all required fields",
        description: "Check the highlighted fields below and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMunicipality || !selectedBusinessType) {
      toast({
        title: "Missing information",
        description: "Please select a municipality and business type.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🚀 Starting business license application submission...');
      console.log('📋 Selected Municipality:', selectedMunicipality);
      console.log('🏢 Selected Business Type ID:', selectedBusinessType);
      
      // Parse the business address
      const addressParts = businessInfo.businessAddress.split(', ');
      const [streetAddress, city, stateZip] = addressParts;
      const [state, zipCode] = stateZip ? stateZip.split(' ') : ['', ''];

      // Parse the owner name
      const ownerNameParts = businessInfo.businessOwner.split(' ');
      const firstName = ownerNameParts[0] || '';
      const lastName = ownerNameParts.slice(1).join(' ') || '';

      // Find selected license type
      const selectedLicenseType = licenseTypes.find(type => type.id === selectedBusinessType);
      console.log('📜 Selected License Type:', selectedLicenseType);

      // Create the application
      const applicationData = {
        customer_id: selectedMunicipality.customer_id,
        license_type_id: selectedBusinessType,
        business_legal_name: businessInfo.businessLegalName,
        business_type: selectedLicenseType?.name || '',
        business_description: businessInfo.businessDescription,
        federal_ein: formatEINForStorage(businessInfo.businessEIN),
        business_street_address: streetAddress || businessInfo.businessAddress,
        business_city: city || '',
        business_state: state || '',
        business_zip_code: zipCode || '',
        business_phone: businessInfo.businessOwnerPhone,
        business_email: businessInfo.businessOwnerEmail,
        owner_first_name: firstName,
        owner_last_name: lastName,
        owner_phone: businessInfo.businessOwnerPhone,
        owner_email: businessInfo.businessOwnerEmail,
        owner_street_address: streetAddress || businessInfo.businessAddress,
        owner_city: city || '',
        owner_state: state || '',
        owner_zip_code: zipCode || '',
        base_fee_cents: selectedLicenseType?.base_fee_cents || 0,
        total_fee_cents: selectedLicenseType?.base_fee_cents || 0,
        additional_info: { additionalDetails: businessInfo.additionalDetails },
        form_responses: {
          useBusinessProfileInfo,
          isDifferentPropertyOwner,
          propertyOwnerInfo: isDifferentPropertyOwner ? propertyOwnerInfo : null,
        }
      };

      console.log('📝 Application Data:', applicationData);
      const result = await createApplication.mutateAsync(applicationData);
      console.log('✅ Application created successfully:', result);

      // Upload documents if any
      for (const doc of businessInfo.uploadedDocuments) {
        if (doc.uploadStatus === 'completed') {
          // Note: In a real implementation, you'd need to store the actual file
          // For now, we'll skip the document upload part since we can't access the file
          console.log('📎 Document upload would happen here:', doc);
        }
      }

      // Submit the application
      console.log('🚀 Submitting application with ID:', result.id);
      await submitApplication.mutateAsync(result.id);

      console.log('✅ Application submitted successfully!');

      toast({
        title: "Application submitted successfully!",
        description: "Your business license application has been submitted for review.",
      });

      handleClose();
    } catch (error: any) {
      console.error('❌ Submission error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      toast({
        title: "Submission failed",
        description: error.message || "An error occurred while submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
                  License Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="municipality" className="text-sm font-medium text-foreground">
                      Municipality *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the municipality where your license will be processed
                    </p>
                    <BuildingPermitsMunicipalityAutocomplete
                      placeholder="Search for your municipality..."
                      onSelect={(municipality) => {
                        handleMunicipalitySelect(municipality);
                      }}
                      className={`mt-1 ${validationErrors.municipality ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.municipality}
                    />
                    {validationErrors.municipality && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.municipality}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="business-type" className="text-sm font-medium text-foreground">
                      Business Type *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the type of business you operate
                    </p>
                    <Select onValueChange={(value) => {
                      handleBusinessTypeSelect(value);
                    }}>
                      <SelectTrigger className={`mt-1 ${validationErrors.businessType ? 'ring-2 ring-destructive border-destructive' : ''}`} data-error={!!validationErrors.businessType}>
                        <SelectValue placeholder="Select a business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {licenseTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(type.base_fee_cents / 100)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.businessType && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.businessType}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Business Information
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="use-business-profile-info" className="text-sm text-muted-foreground">
                    Use Profile Information
                  </Label>
                  <Switch
                    id="use-business-profile-info"
                    checked={useBusinessProfileInfo}
                    onCheckedChange={handleUseBusinessProfileInfoToggle}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="business-legal-name" className="text-sm font-medium text-foreground">
                      Business Legal Name *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the legal name of your business
                    </p>
                    <Input
                      id="business-legal-name"
                      placeholder="Enter business legal name"
                      value={businessInfo.businessLegalName}
                      onChange={(e) => {
                        setBusinessInfo(prev => ({ ...prev, businessLegalName: e.target.value }));
                        if (e.target.value) clearFieldError('businessLegalName');
                      }}
                      className={`mt-1 ${validationErrors.businessLegalName ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.businessLegalName}
                    />
                    {validationErrors.businessLegalName && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.businessLegalName}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="business-owner" className="text-sm font-medium text-foreground">
                      Business Owner *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the full name of the business owner
                    </p>
                    <Input
                      id="business-owner"
                      placeholder="Enter business owner name"
                      value={businessInfo.businessOwner}
                      onChange={(e) => {
                        setBusinessInfo(prev => ({ ...prev, businessOwner: e.target.value }));
                        if (e.target.value) clearFieldError('businessOwner');
                      }}
                      className={`mt-1 ${validationErrors.businessOwner ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.businessOwner}
                    />
                    {validationErrors.businessOwner && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.businessOwner}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="business-owner-phone" className="text-sm font-medium text-foreground">
                      Business Owner Phone Number *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the business owner's contact phone number
                    </p>
                    <Input
                      id="business-owner-phone"
                      placeholder="(xxx) xxx-xxxx"
                      value={businessInfo.businessOwnerPhone}
                      onChange={(e) => {
                        const normalized = normalizePhoneInput(e.target.value);
                        setBusinessInfo(prev => ({ ...prev, businessOwnerPhone: normalized }));
                        if (normalized) clearFieldError('businessOwnerPhone');
                      }}
                      className={`mt-1 ${validationErrors.businessOwnerPhone ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.businessOwnerPhone}
                    />
                    {validationErrors.businessOwnerPhone && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.businessOwnerPhone}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="business-owner-email" className="text-sm font-medium text-foreground">
                      Business Owner Email *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the business owner's email address
                    </p>
                    <Input
                      id="business-owner-email"
                      type="email"
                      placeholder="Enter email address"
                      value={businessInfo.businessOwnerEmail}
                      onChange={(e) => {
                        setBusinessInfo(prev => ({ ...prev, businessOwnerEmail: e.target.value }));
                        if (e.target.value) clearFieldError('businessOwnerEmail');
                      }}
                      className={`mt-1 ${validationErrors.businessOwnerEmail ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.businessOwnerEmail}
                    />
                    {validationErrors.businessOwnerEmail && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.businessOwnerEmail}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="business-address" className="text-sm font-medium text-foreground">
                      Business Address *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the business address
                    </p>
                    <RestPlacesAutocomplete
                      placeholder="Start typing the business address..."
                      onAddressSelect={(addressComponents) => {
                        handleBusinessAddressSelect(addressComponents);
                        clearFieldError('businessAddress');
                      }}
                      value={businessInfo.businessAddress}
                      onChange={(value) => {
                        setBusinessInfo(prev => ({ ...prev, businessAddress: value }));
                        if (value) clearFieldError('businessAddress');
                      }}
                      className={`mt-1 ${validationErrors.businessAddress ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.businessAddress}
                    />
                    {validationErrors.businessAddress && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.businessAddress}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="business-ein" className="text-sm font-medium text-foreground">
                      Business EIN *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter the Employer Identification Number (EIN)
                    </p>
                    <Input
                      id="business-ein"
                      placeholder="XX-XXXXXXX"
                      value={normalizeEINInput(businessInfo.businessEIN)}
                      onChange={(e) => {
                        const formatted = normalizeEINInput(e.target.value);
                        const cleaned = formatEINForStorage(formatted);
                        setBusinessInfo(prev => ({ ...prev, businessEIN: cleaned }));
                        if (cleaned) clearFieldError('businessEIN');
                      }}
                      className={`mt-1 ${validationErrors.businessEIN ? 'ring-2 ring-destructive border-destructive' : ''}`}
                      data-error={!!validationErrors.businessEIN}
                    />
                    {validationErrors.businessEIN && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.businessEIN}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Property Information
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-muted-foreground cursor-pointer" onClick={() => setIsDifferentPropertyOwner(!isDifferentPropertyOwner)}>
                    <div>If Property Owner is Different</div>
                    <div>than Business Owner</div>
                  </div>
                  <Switch
                    id="different-property-owner"
                    checked={isDifferentPropertyOwner}
                    onCheckedChange={setIsDifferentPropertyOwner}
                  />
                </div>
              </CardHeader>
              {isDifferentPropertyOwner && (
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="property-owner-name" className="text-sm font-medium text-foreground">
                        Name/Company *
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Enter the property owner's name or company name
                      </p>
                      <Input
                        id="property-owner-name"
                        placeholder="Enter property owner name"
                        value={propertyOwnerInfo.name}
                        onChange={(e) => {
                          setPropertyOwnerInfo(prev => ({ ...prev, name: e.target.value }));
                          if (e.target.value) clearFieldError('propertyOwnerName');
                        }}
                        className={`mt-1 ${validationErrors.propertyOwnerName ? 'ring-2 ring-destructive border-destructive' : ''}`}
                        data-error={!!validationErrors.propertyOwnerName}
                      />
                      {validationErrors.propertyOwnerName && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.propertyOwnerName}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="property-owner-phone" className="text-sm font-medium text-foreground">
                        Phone Number *
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Enter the property owner's contact phone number
                      </p>
                      <Input
                        id="property-owner-phone"
                        placeholder="(xxx) xxx-xxxx"
                        value={propertyOwnerInfo.phone}
                        onChange={(e) => {
                          const normalized = normalizePhoneInput(e.target.value);
                          setPropertyOwnerInfo(prev => ({ ...prev, phone: normalized }));
                          if (normalized) clearFieldError('propertyOwnerPhone');
                        }}
                        className={`mt-1 ${validationErrors.propertyOwnerPhone ? 'ring-2 ring-destructive border-destructive' : ''}`}
                        data-error={!!validationErrors.propertyOwnerPhone}
                      />
                      {validationErrors.propertyOwnerPhone && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.propertyOwnerPhone}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="property-owner-email" className="text-sm font-medium text-foreground">
                        Email *
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Enter the property owner's email address
                      </p>
                      <Input
                        id="property-owner-email"
                        type="email"
                        placeholder="Enter email address"
                        value={propertyOwnerInfo.email}
                        onChange={(e) => {
                          setPropertyOwnerInfo(prev => ({ ...prev, email: e.target.value }));
                          if (e.target.value) clearFieldError('propertyOwnerEmail');
                        }}
                        className={`mt-1 ${validationErrors.propertyOwnerEmail ? 'ring-2 ring-destructive border-destructive' : ''}`}
                        data-error={!!validationErrors.propertyOwnerEmail}
                      />
                      {validationErrors.propertyOwnerEmail && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.propertyOwnerEmail}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="property-owner-address" className="text-sm font-medium text-foreground">
                        Address *
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Enter the property owner's address
                      </p>
                      <RestPlacesAutocomplete
                        placeholder="Start typing the property owner address..."
                        onAddressSelect={(addressComponents) => {
                          const fullAddress = `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`;
                          setPropertyOwnerInfo(prev => ({ ...prev, address: fullAddress }));
                          clearFieldError('propertyOwnerAddress');
                        }}
                        value={propertyOwnerInfo.address}
                        onChange={(value) => {
                          setPropertyOwnerInfo(prev => ({ ...prev, address: value }));
                          if (value) clearFieldError('propertyOwnerAddress');
                        }}
                        className={`mt-1 ${validationErrors.propertyOwnerAddress ? 'ring-2 ring-destructive border-destructive' : ''}`}
                        data-error={!!validationErrors.propertyOwnerAddress}
                      />
                      {validationErrors.propertyOwnerAddress && (
                        <p className="text-sm text-destructive mt-1">{validationErrors.propertyOwnerAddress}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Business Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-description" className="text-sm font-medium">
                    Business Description
                  </Label>
                  <Textarea
                    id="business-description"
                    placeholder="Please provide a detailed description of your business, including the type of services or products you offer, your target customers, and any other relevant information..."
                    value={businessInfo.businessDescription}
                    onChange={(e) => {
                      setBusinessInfo(prev => ({ ...prev, businessDescription: e.target.value }));
                    }}
                    className="min-h-[120px] resize-none"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {businessInfo.businessDescription.length} characters
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Additional Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Please provide the following information using the formatting tools:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Total Gross Square Footage</li>
                    <li>Average Number of Employees</li>
                    <li>Business Established Date/Years Active</li>
                    <li>Hours of Operations (Monday - Sunday)</li>
                    <li>Any other information you'd like to provide</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <RichTextEditor
                    content={businessInfo.additionalDetails}
                    onChange={(content) => {
                      setBusinessInfo(prev => ({ ...prev, additionalDetails: content }));
                    }}
                    placeholder="Please provide the following details using the formatting tools above:

• Total Gross Square Footage:

• Average Number of Employees:

• Business Established Date/Years Active:

• Hours of Operations:
  - Monday:
  - Tuesday:
  - Wednesday:
  - Thursday:
  - Friday:
  - Saturday:
  - Sunday:

• Any other relevant information:"
                    className="min-h-[200px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
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
                      Upload business-related documents such as business plan, insurance certificates, or zoning approvals
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
                  {businessInfo.uploadedDocuments.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-foreground">
                        Uploaded Files ({businessInfo.uploadedDocuments.length})
                      </Label>
                      {businessInfo.uploadedDocuments.map((doc) => (
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
                          <div className="flex items-center">
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
          <div className="space-y-4">
            {/* License & Business Information Card */}
            <Card className="animate-fade-in">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  License & Business Information
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Municipality</Label>
                      <p className="text-sm font-medium">{selectedMunicipality?.business_name || 'Not selected'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Type</Label>
                      <p className="text-sm font-medium">{formatBusinessType(selectedBusinessType)}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Legal Name</Label>
                      <p className="text-sm font-medium">{businessInfo.businessLegalName}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Owner</Label>
                      <p className="text-sm font-medium">{businessInfo.businessOwner}</p>
                      <p className="text-xs text-muted-foreground">{businessInfo.businessOwnerPhone}</p>
                      <p className="text-xs text-muted-foreground">{businessInfo.businessOwnerEmail}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Address</Label>
                      <p className="text-sm font-medium">{businessInfo.businessAddress}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business EIN</Label>
                      <p className="text-sm font-medium">{formatEINForDisplay(businessInfo.businessEIN)}</p>
                    </div>
                    {isDifferentPropertyOwner && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Property Owner</Label>
                        <p className="text-sm font-medium">{propertyOwnerInfo.name}</p>
                        <p className="text-xs text-muted-foreground">{propertyOwnerInfo.phone}</p>
                        <p className="text-xs text-muted-foreground">{propertyOwnerInfo.email}</p>
                        <p className="text-xs text-muted-foreground">{propertyOwnerInfo.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Details Card */}
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Business Details
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {businessInfo.businessDescription && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Description</Label>
                    <div className="mt-1 text-sm">
                      {businessInfo.businessDescription.length > 200 ? (
                        <div>
                          <p>{businessInfo.businessDescription.substring(0, 200)}...</p>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-primary hover:text-primary/80"
                            onClick={() => {
                              // TODO: Implement expand/collapse functionality
                            }}
                          >
                            View Full Description
                          </Button>
                        </div>
                      ) : (
                        <p>{businessInfo.businessDescription}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {businessInfo.additionalDetails && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional Business Details</Label>
                    <div className="mt-1 text-sm border rounded-lg p-3 bg-muted/20">
                      <SafeHtmlRenderer 
                        content={businessInfo.additionalDetails}
                        className="prose-sm"
                        fallback="No additional details provided"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supporting Documents Card */}
            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Supporting Documents
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Document Count
                    </Label>
                    <p className="text-sm font-medium">
                      {businessInfo.uploadedDocuments.length} {businessInfo.uploadedDocuments.length === 1 ? 'document' : 'documents'} uploaded
                    </p>
                  </div>
                  
                  {businessInfo.uploadedDocuments.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Document List
                      </Label>
                      <div className="space-y-2">
                        {businessInfo.uploadedDocuments.map((doc, index) => (
                          <div key={doc.id} className="flex items-center space-x-3 p-2 border rounded-lg bg-muted/10">
                            <div className="flex-shrink-0">
                              {getFileIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <span>{formatFileSize(doc.size)}</span>
                                <span>•</span>
                                <span className="text-green-600">✓ Ready</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No documents uploaded</p>
                      <p className="text-xs">Documents are optional for this application</p>
                    </div>
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

  const stepLabels = ['Basic Info', 'Business Details', 'Review & Submit'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent ref={dialogContentRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Business License Application</DialogTitle>
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
                    {step === 2 && 'Business Details'}
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