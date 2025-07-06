import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  finixSellerSchema, 
  type FinixSellerFormData,
  type BusinessType 
} from '@/schemas/finixSellerSchema';
import { Form } from '@/components/ui/form';
import { BusinessInformationStep } from './BusinessInformationStep';
import { OwnerInformationStep } from './OwnerInformationStep';
import { ProcessingInformationStep } from './ProcessingInformationStep';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const STEPS = [
  { id: 1, title: "Entity Information" },
  { id: 2, title: "Owner Information" },
  { id: 3, title: "Processing Information" }
];

export function FinixSellerOnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const form = useForm<FinixSellerFormData>({
    resolver: zodResolver(finixSellerSchema),
    defaultValues: {
      businessInformation: {
        businessType: 'GOVERNMENT_AGENCY',
        businessName: '',
        doingBusinessAs: '',
        businessTaxId: '',
        businessPhone: '',
        businessWebsite: 'https://',
        businessDescription: '',
        incorporationDate: '',
        ownershipType: 'PUBLIC',
        businessAddress: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        }
      },
      ownerInformation: {
        firstName: '',
        lastName: '',
        jobTitle: '',
        workEmail: '',
        personalPhone: '',
        personalAddress: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },
        dateOfBirth: '',
        personalTaxId: '',
        ownershipPercentage: 100
      },
      processingInformation: {
        annualAchVolume: 0,
        annualCardVolume: 0,
        averageAchAmount: 0,
        averageCardAmount: 0,
        cardVolumeDistribution: {
          cardPresent: 0,
          moto: 0,
          ecommerce: 100
        },
        businessVolumeDistribution: {
          b2b: 0,
          b2c: 100,
          p2p: 0
        },
        mccCode: '5999', // Default MCC for miscellaneous retail
        statementDescriptor: '',
        maxAchAmount: 0,
        maxCardAmount: 0,
        hasAcceptedCardsPreviously: false,
        refundPolicy: 'FULL_REFUNDS',
        merchantAgreementAccepted: false,
        merchantAgreementMetadata: {
          ipAddress: '',
          timestamp: '',
          userAgent: ''
        },
        creditCheckConsent: false
      }
    }
  });

  const businessType = form.watch('businessInformation.businessType') as BusinessType;
  const isGovernmentAgency = businessType === 'GOVERNMENT_AGENCY';

  // Auto-update MCC code based on business type
  React.useEffect(() => {
    const mccDefaults: Record<BusinessType, string> = {
      'INDIVIDUAL_SOLE_PROPRIETORSHIP': '5999',
      'LIMITED_LIABILITY_COMPANY': '5999', 
      'CORPORATION': '5999',
      'TAX_EXEMPT_ORGANIZATION': '8398',
      'GOVERNMENT_AGENCY': '9399'
    };
    
    if (businessType && mccDefaults[businessType]) {
      form.setValue('processingInformation.mccCode', mccDefaults[businessType]);
    }
  }, [businessType, form]);

  const progress = (currentStep / STEPS.length) * 100;

  const validateCurrentStep = async () => {
    const stepFields: Record<number, (keyof FinixSellerFormData)[]> = {
      1: ['businessInformation'],
      2: ['ownerInformation'],
      3: ['processingInformation']
    };

    const fieldsToValidate = stepFields[currentStep];
    const isValid = await form.trigger(fieldsToValidate);
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before continuing.",
        variant: "destructive"
      });
    }
    
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (data: FinixSellerFormData) => {
    try {
      // Add metadata for legal agreements
      const now = new Date().toISOString();
      const userAgent = navigator.userAgent;
      
      // Get IP address (in real implementation, this would be handled server-side)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      const finalData = {
        ...data,
        processingInformation: {
          ...data.processingInformation,
          merchantAgreementMetadata: {
            ipAddress: ipData.ip,
            timestamp: now,
            userAgent
          },
          creditCheckMetadata: data.processingInformation.creditCheckConsent ? {
            ipAddress: ipData.ip,
            timestamp: now,
            userAgent
          } : undefined
        }
      };

      // Submit to Finix via edge function
      const { data: result, error } = await supabase.functions.invoke('submit-finix-seller', {
        body: finalData
      });

      if (error) {
        throw error;
      }

      if (!result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      console.log('Finix Submission Result:', result);
      
      toast({
        title: "Application Submitted Successfully!",
        description: `Your seller application has been submitted to Finix. Seller ID: ${result.sellerId}`,
      });

      // Optionally redirect or show success details
      
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Submission Error",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <BusinessInformationStep form={form} />;
      case 2:
        return <OwnerInformationStep form={form} isGovernmentAgency={isGovernmentAgency} />;
      case 3:
        return <ProcessingInformationStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Finix Seller Onboarding
          </CardTitle>
          <div className="space-y-4">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    step.id === currentStep ? 'text-primary font-medium' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      step.id === currentStep
                        ? 'bg-primary text-primary-foreground'
                        : step.id < currentStep
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.id}
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{step.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              {renderCurrentStep()}
            
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {currentStep < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit">
                  Submit Application
                </Button>
              )}
            </div>
          </form>
        </Form>
        </CardContent>
      </Card>
    </div>
  );
}