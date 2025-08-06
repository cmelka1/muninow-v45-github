import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MunicipalityAutocomplete } from '@/components/ui/municipality-autocomplete';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PayTaxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedMunicipality {
  customer_id: string;
  legal_entity_name: string;
  doing_business_as: string;
  business_city: string;
  business_state: string;
}

interface TaxInformation {
  municipality: SelectedMunicipality | null;
  taxType: string;
}

export const PayTaxDialog: React.FC<PayTaxDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [taxInfo, setTaxInfo] = useState<TaxInformation>({
    municipality: null,
    taxType: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const dialogContentRef = useRef<HTMLDivElement>(null);
  
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep1Fields = () => {
    const errors: Record<string, string> = {};

    if (!taxInfo.municipality) errors.municipality = 'Municipality is required';
    if (!taxInfo.taxType) errors.taxType = 'Tax type is required';

    return errors;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1 mandatory fields before proceeding
      const errors = validateStep1Fields();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
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
    setTaxInfo({
      municipality: null,
      taxType: ''
    });
    setValidationErrors({});
    onOpenChange(false);
  };

  const handleMunicipalitySelect = (municipality: SelectedMunicipality) => {
    setTaxInfo(prev => ({ ...prev, municipality }));
    clearFieldError('municipality');
  };

  const handleTaxTypeChange = (value: string) => {
    setTaxInfo(prev => ({ ...prev, taxType: value }));
    clearFieldError('taxType');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Tax Info';
      case 2: return 'Business Information';
      case 3: return 'Payment & Review';
      default: return 'Tax Info';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Tax Information Card */}
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Tax Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="municipality" className="text-sm font-medium">
                    Municipality <span className="text-destructive">*</span>
                  </Label>
                  <MunicipalityAutocomplete
                    value={taxInfo.municipality?.legal_entity_name || ''}
                    onSelect={handleMunicipalitySelect}
                    placeholder="Search for your municipality..."
                    className={validationErrors.municipality ? 'border-destructive' : ''}
                  />
                  {validationErrors.municipality && (
                    <p className="text-sm text-destructive">{validationErrors.municipality}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxType" className="text-sm font-medium">
                    Tax Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={taxInfo.taxType} onValueChange={handleTaxTypeChange}>
                    <SelectTrigger className={validationErrors.taxType ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food-beverage">Food & Beverage</SelectItem>
                      <SelectItem value="amusement">Amusement</SelectItem>
                      <SelectItem value="hotel-motel">Hotel & Motel</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.taxType && (
                    <p className="text-sm text-destructive">{validationErrors.taxType}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Business Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Business information fields will be added here.</p>
              </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-lg">Payment & Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Payment and review section will be added here.</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        ref={dialogContentRef}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Pay Tax - {getStepTitle()}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2 shrink-0">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t shrink-0">
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
                Submit Payment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};