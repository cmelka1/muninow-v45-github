import React, { useState } from 'react';
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
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { usePermitTypes, PermitType } from '@/hooks/usePermitTypes';
import { useMunicipalPermitQuestions } from '@/hooks/useMunicipalPermitQuestions';
import { formatCurrency } from '@/lib/formatters';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import { ContractorForm, ContractorInfo } from '@/components/ContractorForm';
import { Plus } from 'lucide-react';

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
  
  const { data: permitTypes, isLoading: isLoadingPermitTypes } = usePermitTypes();
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
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
                            <div className="flex flex-col">
                              <span className="font-medium">{permitType.name}</span>
                              <span className="text-xs text-muted-foreground">{permitType.description}</span>
                            </div>
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
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Review & Submit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-2xl">✅</div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Final permit application review, payment processing, and submission will be handled here.
                  </p>
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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