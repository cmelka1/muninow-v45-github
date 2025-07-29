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
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { usePermitTypes, PermitType } from '@/hooks/usePermitTypes';
import { formatCurrency } from '@/lib/formatters';

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
  
  const { data: permitTypes, isLoading: isLoadingPermitTypes } = usePermitTypes();

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
    onOpenChange(false);
  };

  const handleMunicipalitySelect = (municipality: SelectedMunicipality) => {
    setSelectedMunicipality(municipality);
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
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

            <Separator className="my-6" />

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
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-2xl">📋</div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Additional permit information including project details, timeline, and documentation requirements will be collected here.
                  </p>
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