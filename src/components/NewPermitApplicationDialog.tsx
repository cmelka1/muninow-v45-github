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

  const handleNext = () => {
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
    onOpenChange(false);
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
                      onSelect={handleMunicipalitySelect}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="permit-type" className="text-sm font-medium text-foreground">
                      Permit Type *
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the type of permit you need
                    </p>
                    <Select onValueChange={handlePermitTypeSelect} disabled={isLoadingPermitTypes}>
                      <SelectTrigger className="mt-1">
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
                      onAddressSelect={handleAddressSelect}
                      value={propertyInfo.address}
                      onChange={(value) => setPropertyInfo(prev => ({ ...prev, address: value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pin-number" className="text-sm font-medium text-foreground">
                      PIN Number <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Property Identification Number if available
                    </p>
                    <Input
                      id="pin-number"
                      placeholder="Enter PIN number"
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
                        onChange={(e) => handleEstimatedValueChange(e.target.value)}
                        className="pl-8"
                      />
                    </div>
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
                      onChange={(e) => setApplicantInfo(prev => ({ ...prev, nameOrCompany: e.target.value }))}
                      className="mt-1"
                      disabled={useProfileInfo}
                    />
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
                      }}
                      className="mt-1"
                      disabled={useProfileInfo}
                    />
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
                      onChange={(e) => setApplicantInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1"
                      disabled={useProfileInfo}
                    />
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
                      onAddressSelect={useProfileInfo ? () => {} : handleApplicantAddressSelect}
                      value={applicantInfo.address}
                      onChange={useProfileInfo ? () => {} : (value) => setApplicantInfo(prev => ({ ...prev, address: value }))}
                      className={`mt-1 ${useProfileInfo ? 'opacity-50 pointer-events-none' : ''}`}
                    />
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
                      onChange={(e) => setPropertyOwnerInfo(prev => ({ ...prev, nameOrCompany: e.target.value }))}
                      className="mt-1"
                      disabled={sameAsApplicant}
                    />
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
                      }}
                      className="mt-1"
                      disabled={sameAsApplicant}
                    />
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
                      onChange={(e) => setPropertyOwnerInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1"
                      disabled={sameAsApplicant}
                    />
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
                      onAddressSelect={sameAsApplicant ? () => {} : handlePropertyOwnerAddressSelect}
                      value={propertyOwnerInfo.address}
                      onChange={sameAsApplicant ? () => {} : (value) => setPropertyOwnerInfo(prev => ({ ...prev, address: value }))}
                      className={`mt-1 ${sameAsApplicant ? 'opacity-50 pointer-events-none' : ''}`}
                    />
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
                  <Textarea
                    id="scope-of-work"
                    placeholder="Enter a detailed description of the construction work, materials to be used, and any other relevant details..."
                    value={scopeOfWork}
                    onChange={(e) => setScopeOfWork(e.target.value)}
                    className="mt-1 min-h-[120px]"
                  />
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
                      {propertyInfo.estimatedValue ? formatCurrency(propertyInfo.estimatedValue / 100) : 'Not provided'}
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
                              {questionResponses[question.id]?.toString() || 'Not answered'}
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
                  <p className="text-sm mt-1">{scopeOfWork || 'Not provided'}</p>
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

            {/* Summary */}
            <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Application Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Base Fee</p>
                    <p className="text-lg font-semibold">
                      {selectedPermitType ? formatCurrency(selectedPermitType.base_fee_cents / 100) : '$0.00'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Processing Time</p>
                    <p className="text-lg font-semibold">
                      {selectedPermitType ? `${selectedPermitType.processing_days} days` : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Inspection Required</p>
                    <p className="text-lg font-semibold">
                      {selectedPermitType ? (selectedPermitType.requires_inspection ? 'Yes' : 'No') : 'N/A'}
                    </p>
                  </div>
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
                <Button onClick={handleClose}>
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};