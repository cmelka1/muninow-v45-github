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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PayTaxDialogProps {
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

interface TaxType {
  id: string;
  name: string;
  description: string;
  calculationMethod: 'gross_receipts' | 'per_room' | 'percentage_base';
}

interface BusinessInformation {
  businessName: string;
  businessAddress: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  federalTaxId: string;
}

interface TaxCalculationData {
  // Food & Beverage specific
  grossReceipts?: number;
  taxPeriodStart?: string;
  taxPeriodEnd?: string;
  
  // Hotel & Motels specific
  numberOfRooms?: number;
  averageRate?: number;
  occupancyRate?: number;
  
  // Amusement specific
  admissionFees?: number;
  otherRevenue?: number;
  
  // Common fields
  totalTaxDue?: number;
}

const taxTypes: TaxType[] = [
  {
    id: 'food_beverage',
    name: 'Food & Beverage',
    description: 'Tax on food and beverage sales',
    calculationMethod: 'gross_receipts'
  },
  {
    id: 'amusement',
    name: 'Amusement',
    description: 'Tax on amusement and entertainment services',
    calculationMethod: 'percentage_base'
  },
  {
    id: 'hotel_motels',
    name: 'Hotel & Motels',
    description: 'Tax on hotel and motel accommodations',
    calculationMethod: 'per_room'
  }
];

export const PayTaxDialog: React.FC<PayTaxDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<SelectedMunicipality | null>(null);
  const [selectedTaxType, setSelectedTaxType] = useState<TaxType | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInformation>({
    businessName: '',
    businessAddress: '',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    federalTaxId: ''
  });
  const [taxCalculationData, setTaxCalculationData] = useState<TaxCalculationData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!selectedMunicipality) errors.municipality = 'Municipality is required';
    if (!selectedTaxType) errors.taxType = 'Tax type is required';
    return errors;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!businessInfo.businessName) errors.businessName = 'Business name is required';
    if (!businessInfo.businessAddress) errors.businessAddress = 'Business address is required';
    if (!businessInfo.contactPerson) errors.contactPerson = 'Contact person is required';
    if (!businessInfo.phoneNumber) errors.phoneNumber = 'Phone number is required';
    if (!businessInfo.email) errors.email = 'Email is required';
    if (!businessInfo.federalTaxId) errors.federalTaxId = 'Federal Tax ID is required';
    return errors;
  };

  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    
    if (selectedTaxType?.calculationMethod === 'gross_receipts') {
      if (!taxCalculationData.grossReceipts || taxCalculationData.grossReceipts <= 0) {
        errors.grossReceipts = 'Gross receipts amount is required';
      }
      if (!taxCalculationData.taxPeriodStart) errors.taxPeriodStart = 'Tax period start date is required';
      if (!taxCalculationData.taxPeriodEnd) errors.taxPeriodEnd = 'Tax period end date is required';
    }
    
    if (selectedTaxType?.calculationMethod === 'per_room') {
      if (!taxCalculationData.numberOfRooms || taxCalculationData.numberOfRooms <= 0) {
        errors.numberOfRooms = 'Number of rooms is required';
      }
      if (!taxCalculationData.averageRate || taxCalculationData.averageRate <= 0) {
        errors.averageRate = 'Average room rate is required';
      }
      if (!taxCalculationData.occupancyRate || taxCalculationData.occupancyRate <= 0) {
        errors.occupancyRate = 'Occupancy rate is required';
      }
    }
    
    if (selectedTaxType?.calculationMethod === 'percentage_base') {
      if (!taxCalculationData.admissionFees || taxCalculationData.admissionFees <= 0) {
        errors.admissionFees = 'Admission fees amount is required';
      }
    }
    
    return errors;
  };

  const handleNext = () => {
    let errors: Record<string, string> = {};
    
    if (currentStep === 1) {
      errors = validateStep1();
    } else if (currentStep === 2) {
      errors = validateStep2();
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      if (dialogContentRef.current) {
        dialogContentRef.current.scrollTop = 0;
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (dialogContentRef.current) {
        dialogContentRef.current.scrollTop = 0;
      }
    }
  };

  const calculateTax = () => {
    if (!selectedTaxType) return 0;
    
    switch (selectedTaxType.calculationMethod) {
      case 'gross_receipts':
        // Food & Beverage: 3% of gross receipts
        return (taxCalculationData.grossReceipts || 0) * 0.03;
      case 'per_room':
        // Hotel & Motels: $2 per room per night based on occupancy
        const { numberOfRooms = 0, occupancyRate = 0 } = taxCalculationData;
        const occupiedRoomNights = numberOfRooms * (occupancyRate / 100) * 30; // Assuming monthly
        return occupiedRoomNights * 2;
      case 'percentage_base':
        // Amusement: 5% of admission fees and other revenue
        const { admissionFees = 0, otherRevenue = 0 } = taxCalculationData;
        return (admissionFees + otherRevenue) * 0.05;
      default:
        return 0;
    }
  };

  const handleSubmit = async () => {
    const errors = validateStep3();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!profile?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit a tax payment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const calculatedTax = calculateTax();
      
      // Here you would implement the actual tax submission logic
      // For now, we'll just show a success message
      
      toast({
        title: "Tax calculation completed!",
        description: `Tax due: $${calculatedTax.toFixed(2)}. Payment processing will be implemented soon.`,
      });

      handleClose();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "An error occurred while processing your tax payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedMunicipality(null);
    setSelectedTaxType(null);
    setBusinessInfo({
      businessName: '',
      businessAddress: '',
      contactPerson: '',
      phoneNumber: '',
      email: '',
      federalTaxId: ''
    });
    setTaxCalculationData({});
    setIsSubmitting(false);
    setValidationErrors({});
    onOpenChange(false);
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

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Municipality and Tax Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="municipality">Municipality *</Label>
            <BuildingPermitsMunicipalityAutocomplete
              onSelect={(municipality) => {
                setSelectedMunicipality(municipality);
                clearFieldError('municipality');
              }}
              placeholder="Search for your municipality..."
              className={validationErrors.municipality ? 'border-destructive' : ''}
            />
            {validationErrors.municipality && (
              <p className="text-sm text-destructive mt-1">{validationErrors.municipality}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tax-type">Tax Type *</Label>
            <Select 
              value={selectedTaxType?.id || ''} 
              onValueChange={(value) => {
                const taxType = taxTypes.find(t => t.id === value);
                setSelectedTaxType(taxType || null);
                clearFieldError('taxType');
              }}
            >
              <SelectTrigger className={validationErrors.taxType ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select tax type" />
              </SelectTrigger>
              <SelectContent>
                {taxTypes.map((taxType) => (
                  <SelectItem key={taxType.id} value={taxType.id}>
                    <div>
                      <div className="font-medium">{taxType.name}</div>
                      <div className="text-sm text-muted-foreground">{taxType.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.taxType && (
              <p className="text-sm text-destructive mt-1">{validationErrors.taxType}</p>
            )}
          </div>

          {selectedMunicipality && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium text-sm mb-2">Selected Municipality:</h4>
                <p className="text-sm">{selectedMunicipality.merchant_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMunicipality.customer_city}, {selectedMunicipality.customer_state}
                </p>
              </CardContent>
            </Card>
          )}

          {selectedTaxType && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium text-sm mb-2">Selected Tax Type:</h4>
                <p className="text-sm font-medium">{selectedTaxType.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTaxType.description}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business-name">Business Name *</Label>
              <Input
                id="business-name"
                value={businessInfo.businessName}
                onChange={(e) => {
                  setBusinessInfo(prev => ({ ...prev, businessName: e.target.value }));
                  clearFieldError('businessName');
                }}
                placeholder="Enter business name"
                className={validationErrors.businessName ? 'border-destructive' : ''}
              />
              {validationErrors.businessName && (
                <p className="text-sm text-destructive mt-1">{validationErrors.businessName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="federal-tax-id">Federal Tax ID *</Label>
              <Input
                id="federal-tax-id"
                value={businessInfo.federalTaxId}
                onChange={(e) => {
                  setBusinessInfo(prev => ({ ...prev, federalTaxId: e.target.value }));
                  clearFieldError('federalTaxId');
                }}
                placeholder="XX-XXXXXXX"
                className={validationErrors.federalTaxId ? 'border-destructive' : ''}
              />
              {validationErrors.federalTaxId && (
                <p className="text-sm text-destructive mt-1">{validationErrors.federalTaxId}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="business-address">Business Address *</Label>
            <Input
              id="business-address"
              value={businessInfo.businessAddress}
              onChange={(e) => {
                setBusinessInfo(prev => ({ ...prev, businessAddress: e.target.value }));
                clearFieldError('businessAddress');
              }}
              placeholder="Enter complete business address"
              className={validationErrors.businessAddress ? 'border-destructive' : ''}
            />
            {validationErrors.businessAddress && (
              <p className="text-sm text-destructive mt-1">{validationErrors.businessAddress}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="contact-person">Contact Person *</Label>
              <Input
                id="contact-person"
                value={businessInfo.contactPerson}
                onChange={(e) => {
                  setBusinessInfo(prev => ({ ...prev, contactPerson: e.target.value }));
                  clearFieldError('contactPerson');
                }}
                placeholder="Contact person name"
                className={validationErrors.contactPerson ? 'border-destructive' : ''}
              />
              {validationErrors.contactPerson && (
                <p className="text-sm text-destructive mt-1">{validationErrors.contactPerson}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone-number">Phone Number *</Label>
              <Input
                id="phone-number"
                value={businessInfo.phoneNumber}
                onChange={(e) => {
                  setBusinessInfo(prev => ({ ...prev, phoneNumber: e.target.value }));
                  clearFieldError('phoneNumber');
                }}
                placeholder="(XXX) XXX-XXXX"
                className={validationErrors.phoneNumber ? 'border-destructive' : ''}
              />
              {validationErrors.phoneNumber && (
                <p className="text-sm text-destructive mt-1">{validationErrors.phoneNumber}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={businessInfo.email}
                onChange={(e) => {
                  setBusinessInfo(prev => ({ ...prev, email: e.target.value }));
                  clearFieldError('email');
                }}
                placeholder="business@example.com"
                className={validationErrors.email ? 'border-destructive' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-destructive mt-1">{validationErrors.email}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => {
    const calculatedTax = calculateTax();
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tax Calculation - {selectedTaxType?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTaxType?.calculationMethod === 'gross_receipts' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="gross-receipts">Gross Receipts ($) *</Label>
                    <Input
                      id="gross-receipts"
                      type="number"
                      step="0.01"
                      value={taxCalculationData.grossReceipts || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          grossReceipts: parseFloat(e.target.value) || 0 
                        }));
                        clearFieldError('grossReceipts');
                      }}
                      placeholder="0.00"
                      className={validationErrors.grossReceipts ? 'border-destructive' : ''}
                    />
                    {validationErrors.grossReceipts && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.grossReceipts}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="period-start">Tax Period Start *</Label>
                    <Input
                      id="period-start"
                      type="date"
                      value={taxCalculationData.taxPeriodStart || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          taxPeriodStart: e.target.value 
                        }));
                        clearFieldError('taxPeriodStart');
                      }}
                      className={validationErrors.taxPeriodStart ? 'border-destructive' : ''}
                    />
                    {validationErrors.taxPeriodStart && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.taxPeriodStart}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="period-end">Tax Period End *</Label>
                    <Input
                      id="period-end"
                      type="date"
                      value={taxCalculationData.taxPeriodEnd || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          taxPeriodEnd: e.target.value 
                        }));
                        clearFieldError('taxPeriodEnd');
                      }}
                      className={validationErrors.taxPeriodEnd ? 'border-destructive' : ''}
                    />
                    {validationErrors.taxPeriodEnd && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.taxPeriodEnd}</p>
                    )}
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tax Rate: 3% of gross receipts</p>
                </div>
              </div>
            )}

            {selectedTaxType?.calculationMethod === 'per_room' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="num-rooms">Number of Rooms *</Label>
                    <Input
                      id="num-rooms"
                      type="number"
                      value={taxCalculationData.numberOfRooms || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          numberOfRooms: parseInt(e.target.value) || 0 
                        }));
                        clearFieldError('numberOfRooms');
                      }}
                      placeholder="0"
                      className={validationErrors.numberOfRooms ? 'border-destructive' : ''}
                    />
                    {validationErrors.numberOfRooms && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.numberOfRooms}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="avg-rate">Average Room Rate ($) *</Label>
                    <Input
                      id="avg-rate"
                      type="number"
                      step="0.01"
                      value={taxCalculationData.averageRate || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          averageRate: parseFloat(e.target.value) || 0 
                        }));
                        clearFieldError('averageRate');
                      }}
                      placeholder="0.00"
                      className={validationErrors.averageRate ? 'border-destructive' : ''}
                    />
                    {validationErrors.averageRate && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.averageRate}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="occupancy-rate">Occupancy Rate (%) *</Label>
                    <Input
                      id="occupancy-rate"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={taxCalculationData.occupancyRate || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          occupancyRate: parseFloat(e.target.value) || 0 
                        }));
                        clearFieldError('occupancyRate');
                      }}
                      placeholder="0.0"
                      className={validationErrors.occupancyRate ? 'border-destructive' : ''}
                    />
                    {validationErrors.occupancyRate && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.occupancyRate}</p>
                    )}
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tax Rate: $2 per occupied room per night (calculated monthly)</p>
                </div>
              </div>
            )}

            {selectedTaxType?.calculationMethod === 'percentage_base' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admission-fees">Admission Fees ($) *</Label>
                    <Input
                      id="admission-fees"
                      type="number"
                      step="0.01"
                      value={taxCalculationData.admissionFees || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          admissionFees: parseFloat(e.target.value) || 0 
                        }));
                        clearFieldError('admissionFees');
                      }}
                      placeholder="0.00"
                      className={validationErrors.admissionFees ? 'border-destructive' : ''}
                    />
                    {validationErrors.admissionFees && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.admissionFees}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="other-revenue">Other Revenue ($)</Label>
                    <Input
                      id="other-revenue"
                      type="number"
                      step="0.01"
                      value={taxCalculationData.otherRevenue || ''}
                      onChange={(e) => {
                        setTaxCalculationData(prev => ({ 
                          ...prev, 
                          otherRevenue: parseFloat(e.target.value) || 0 
                        }));
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tax Rate: 5% of admission fees and other revenue</p>
                </div>
              </div>
            )}

            <Separator />

            <Card className="bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Tax Due:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${calculatedTax.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pay Tax - Step {currentStep} of {totalSteps}</DialogTitle>
          <Progress value={progress} className="w-full" />
        </DialogHeader>
        
        <div className="flex-1 overflow-auto" ref={dialogContentRef}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            
            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Calculate & Proceed to Payment'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};