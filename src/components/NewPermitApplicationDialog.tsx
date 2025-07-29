import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BuildingPermitsMunicipalityAutocomplete } from '@/components/ui/building-permits-municipality-autocomplete';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

export const NewPermitApplicationDialog: React.FC<NewPermitApplicationDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<SelectedMunicipality | null>(null);

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
    onOpenChange(false);
  };

  const handleMunicipalitySelect = (municipality: SelectedMunicipality) => {
    setSelectedMunicipality(municipality);
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
                </div>
              </CardContent>
            </Card>

            <Separator className="my-6" />

            <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Additional permit details will be collected here in the next step.
                  </p>
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