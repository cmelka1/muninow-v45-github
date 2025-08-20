import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BuildingPermitsMunicipalityAutocomplete } from '@/components/ui/building-permits-municipality-autocomplete';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
    businessEIN: ''
  });
  const [useBusinessProfileInfo, setUseBusinessProfileInfo] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

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
      businessEIN: ''
    });
    setUseBusinessProfileInfo(false);
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
        businessEIN: prev.businessEIN || ''
      }));
    }
    // Note: We no longer clear fields when toggled off to preserve user input
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

    setIsSubmitting(true);

    try {
      // TODO: Implement actual submission logic
      toast({
        title: "Application submitted successfully!",
        description: "Your business license application has been submitted for review.",
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
                        <SelectItem value="retail_trade">Retail & Trade</SelectItem>
                        <SelectItem value="professional_services">Professional Services</SelectItem>
                        <SelectItem value="construction_contracting">Construction & Contracting</SelectItem>
                        <SelectItem value="industrial_manufacturing">Industrial & Manufacturing</SelectItem>
                        <SelectItem value="personal_services">Personal Services</SelectItem>
                        <SelectItem value="hospitality_lodging">Hospitality & Lodging</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                      value={businessInfo.businessEIN}
                      onChange={(e) => {
                        setBusinessInfo(prev => ({ ...prev, businessEIN: e.target.value }));
                        if (e.target.value) clearFieldError('businessEIN');
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
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Step 2 - Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Additional form fields will be added here.</p>
              </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Step 3 - Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Review and submission will be added here.</p>
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