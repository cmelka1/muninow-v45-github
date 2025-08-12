import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { BuildingPermitsMunicipalityAutocomplete } from '@/components/ui/building-permits-municipality-autocomplete';
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import { FoodBeverageTaxForm } from './tax-forms/FoodBeverageTaxForm';
import { HotelMotelTaxForm } from './tax-forms/HotelMotelTaxForm';
import { AmusementTaxForm } from './tax-forms/AmusementTaxForm';
import PaymentSummary from './PaymentSummary';
import { formatCurrency } from '@/lib/formatters';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentButtonsContainer from './PaymentButtonsContainer';
import { useTaxPaymentMethods } from '@/hooks/useTaxPaymentMethods';
import { AddPaymentMethodDialog } from './profile/AddPaymentMethodDialog';


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

interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

export const PayTaxDialog: React.FC<PayTaxDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { profile } = useAuth();

  // Step management
  const totalSteps = 3;
  const [currentStep, setCurrentStep] = useState(1);
  const progress = (currentStep / totalSteps) * 100;
  const contentRef = useRef<HTMLDivElement>(null);

  // Step 1: Tax Information
  const [selectedMunicipality, setSelectedMunicipality] = useState<SelectedMunicipality | null>(null);
  const [taxType, setTaxType] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  // Payer Information
  const [payerName, setPayerName] = useState('');
  const [payerEin, setPayerEin] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerAddress, setPayerAddress] = useState<AddressComponents | null>(null);
  const [payerAddressDisplay, setPayerAddressDisplay] = useState('');
  const [useProfileInfoForPayer, setUseProfileInfoForPayer] = useState(false);

  // Tax Calculation Data
  const [foodBeverageTaxData, setFoodBeverageTaxData] = useState({
    grossSales: '',
    deductions: '',
    taxableReceipts: '0.00',
    tax: '0.00',
    commission: '0.00',
    totalDue: '0.00'
  });

  const [hotelMotelTaxData, setHotelMotelTaxData] = useState({
    line1: '', // Total Monthly Receipts
    stateTax: '', // State Tax Deduction
    miscReceipts: '', // Misc Receipts Deduction
    monthsLate: '', // Months Late (0-12)
    creditsAttached: '', // Credits Attached
    // Calculated fields
    line2Total: '0.00', // Total Deduction
    line3: '0.00', // Net Receipts
    line4: '0.00', // Municipal Tax
    line5: '0.00', // Penalty
    line6: '0.00', // Total Tax including Penalty
    line8: '0.00' // Total Payment Due
  });

  const [amusementTaxData, setAmusementTaxData] = useState({
    netReceipts: '',
    deductions: '',
    taxableReceipts: '0.00',
    tax: '0.00',
    commission: '0.00',
    totalDue: '0.00'
  });

  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Submission state and errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Add payment method dialog state
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);

  // Tax amount calculation for payment methods
  const getTaxAmountInCents = () => {
    if (taxType === 'Food & Beverage') {
      return Math.round((parseFloat(foodBeverageTaxData.totalDue) || 0) * 100);
    } else if (taxType === 'Hotel & Motel') {
      return Math.round((parseFloat(hotelMotelTaxData.line8) || 0) * 100);
    } else if (taxType === 'Amusement') {
      return Math.round((parseFloat(amusementTaxData.totalDue) || 0) * 100);
    }
    return 0;
  };

  const getCurrentTaxCalculationData = () => {
    if (taxType === 'Food & Beverage') {
      return foodBeverageTaxData;
    } else if (taxType === 'Hotel & Motel') {
      return hotelMotelTaxData;
    } else if (taxType === 'Amusement') {
      return amusementTaxData;
    }
    return {};
  };

  const getPayerData = () => {
    if (!payerAddress) return null;
    
    return {
      firstName: payerName.split(' ')[0] || '',
      lastName: payerName.split(' ').slice(1).join(' ') || '',
      email: payerEmail,
      ein: payerEin,
      phone: payerPhone,
      businessName: payerName.includes('LLC') || payerName.includes('Inc') || payerName.includes('Corp') ? payerName : undefined,
      address: {
        street: payerAddress.streetAddress,
        city: payerAddress.city,
        state: payerAddress.state,
        zipCode: payerAddress.zipCode
      }
    };
  };

  const getCurrentTaxPeriodStart = () => {
    // For now, default to current year start - can be made configurable later
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const getCurrentTaxPeriodEnd = () => {
    // For now, default to current year end - can be made configurable later  
    const now = new Date();
    return `${now.getFullYear()}-12-31`;
  };

  const getCurrentTaxYear = () => {
    return new Date().getFullYear();
  };

  // Payment methods integration
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isProcessingPayment,
    serviceFee,
    totalWithFee,
    paymentInstruments,
    topPaymentMethods,
    paymentMethodsLoading,
    googlePayMerchantId,
    handlePayment,
    handleGooglePayment,
    handleApplePayment,
    loadPaymentInstruments
  } = useTaxPaymentMethods({
    municipality: selectedMunicipality,
    taxType,
    amount: getTaxAmountInCents(),
    calculationData: getCurrentTaxCalculationData(),
    payer: getPayerData(),
    taxPeriodStart: getCurrentTaxPeriodStart(),
    taxPeriodEnd: getCurrentTaxPeriodEnd(),
    taxYear: getCurrentTaxYear()
  });

  const scrollTop = () => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  const clearFieldError = (fieldName: string) => {
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const formatEin = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    
    // Format as XX-XXXXXXX
    if (digitsOnly.length >= 3) {
      return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 9)}`;
    } else if (digitsOnly.length >= 1) {
      return digitsOnly;
    }
    return '';
  };

  const handleUseProfileInfoForPayerToggle = (checked: boolean) => {
    setUseProfileInfoForPayer(checked);
    if (checked && profile) {
      // Populate payer info with profile data
      const fullName = profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : profile.business_legal_name || '';
      
      const fullAddress = profile.street_address 
        ? `${profile.street_address}${profile.city ? `, ${profile.city}` : ''}${profile.state ? `, ${profile.state}` : ''}${profile.zip_code ? ` ${profile.zip_code}` : ''}`
        : '';

      setPayerName(fullName);
      setPayerEin(''); // EIN not stored in profile, leave empty
      setPayerPhone(profile.phone ? normalizePhoneInput(profile.phone) : '');
      setPayerEmail(profile.email || '');
      setPayerAddressDisplay(fullAddress);
      
      if (profile.street_address) {
        setPayerAddress({
          streetAddress: profile.street_address,
          city: profile.city || '',
          state: profile.state || '',
          zipCode: profile.zip_code || ''
        });
      }
    } else if (!checked) {
      // Clear payer info when toggled off
      setPayerName('');
      setPayerEin('');
      setPayerPhone('');
      setPayerEmail('');
      setPayerAddress(null);
      setPayerAddressDisplay('');
    }
  };

  const handlePayerAddressSelect = (addressComponents: AddressComponents) => {
    setPayerAddress(addressComponents);
    setPayerAddressDisplay(
      `${addressComponents.streetAddress}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipCode}`
    );
    clearFieldError('payerAddress');
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!selectedMunicipality) e.municipality = 'Municipality is required';
    if (!taxType) e.taxType = 'Tax type is required';
    if (!payerName.trim()) e.payerName = 'Full name is required';
    if (!payerEmail.trim()) e.payerEmail = 'Email is required';
    if (!payerPhone.trim()) e.payerPhone = 'Phone is required';
    if (!payerAddress) e.payerAddress = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
      scrollTop();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      scrollTop();
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedMunicipality(null);
    setTaxType('');
    setAccountNumber('');
    setAmount('');
    setMemo('');
    setPayerName('');
    setPayerEin('');
    setPayerEmail('');
    setPayerPhone('');
    setPayerAddress(null);
    setPayerAddressDisplay('');
    setUseProfileInfoForPayer(false);
    setUploadedDocuments([]);
    setDragActive(false);
    
    // Reset tax calculation data
    setFoodBeverageTaxData({
      grossSales: '',
      deductions: '',
      taxableReceipts: '0.00',
      tax: '0.00',
      commission: '0.00',
      totalDue: '0.00'
    });
    
    setHotelMotelTaxData({
      line1: '', // Total Monthly Receipts
      stateTax: '', // State Tax Deduction
      miscReceipts: '', // Misc Receipts Deduction
      monthsLate: '', // Months Late (0-12)
      creditsAttached: '', // Credits Attached
      // Calculated fields
      line2Total: '0.00', // Total Deduction
      line3: '0.00', // Net Receipts
      line4: '0.00', // Municipal Tax
      line5: '0.00', // Penalty
      line6: '0.00', // Total Tax including Penalty
      line8: '0.00' // Total Payment Due
    });
    
    setAmusementTaxData({
      netReceipts: '',
      deductions: '',
      taxableReceipts: '0.00',
      tax: '0.00',
      commission: '0.00',
      totalDue: '0.00'
    });
    
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      scrollTop();
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await handlePayment();
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const handleAddPaymentMethodSuccess = (paymentMethodId: string) => {
    // Refresh payment instruments and auto-select the new one
    loadPaymentInstruments();
    setSelectedPaymentMethod(paymentMethodId);
    setIsAddPaymentMethodOpen(false);
    toast({
      title: "Payment method added",
      description: "Your new payment method has been added successfully.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" ref={contentRef}>
        <DialogHeader>
          <DialogTitle>Pay Tax</DialogTitle>
          <DialogDescription>Complete the steps below to submit your tax payment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4 pb-6 border-b">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

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
                    {step === 1 && 'Tax & Payer Info'}
                    {step === 2 && 'Calculation & Docs'}
                    {step === 3 && 'Review & Payment'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="min-h-[400px] py-2">
            {/* Step Content */}
            <div className="space-y-4">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <Card className="animate-fade-in">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Tax Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Municipality</Label>
                        <BuildingPermitsMunicipalityAutocomplete
                          onSelect={(m) => setSelectedMunicipality(m as SelectedMunicipality)}
                          placeholder="Search your municipality"
                        />
                        {errors.municipality && <p className="text-sm text-destructive">{errors.municipality}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Tax Type</Label>
                        <Select value={taxType} onValueChange={setTaxType}>
                          <SelectTrigger aria-label="Tax type">
                            <SelectValue placeholder="Select tax type" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            <SelectItem value="Food & Beverage">Food &amp; Beverage</SelectItem>
                            <SelectItem value="Hotel & Motel">Hotel &amp; Motel</SelectItem>
                            <SelectItem value="Amusement">Amusement</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.taxType && <p className="text-sm text-destructive">{errors.taxType}</p>}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Payer Information
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="use-profile-info-payer" className="text-sm text-muted-foreground">
                          Use Profile Information
                        </Label>
                        <Switch
                          id="use-profile-info-payer"
                          checked={useProfileInfoForPayer}
                          onCheckedChange={handleUseProfileInfoForPayerToggle}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                           <Label htmlFor="payer-name" className="text-sm font-medium text-foreground">
                             Name/Company *
                           </Label>
                          <Input
                            id="payer-name"
                            placeholder="Enter name or company"
                            value={payerName}
                            onChange={(e) => {
                              setPayerName(e.target.value);
                              if (e.target.value) clearFieldError('payerName');
                            }}
                            className={`mt-1 ${useProfileInfoForPayer ? 'opacity-50 pointer-events-none' : ''} ${errors.payerName ? 'ring-2 ring-destructive border-destructive' : ''}`}
                            disabled={useProfileInfoForPayer}
                            data-error={!!errors.payerName}
                          />
                          {errors.payerName && (
                            <p className="text-sm text-destructive mt-1">{errors.payerName}</p>
                          )}
                         </div>
                         
                         <div>
                           <Label htmlFor="payer-ein" className="text-sm font-medium text-foreground">
                             Employer Identification Number (EIN)
                           </Label>
                           <Input
                             id="payer-ein"
                             placeholder="XX-XXXXXXX"
                             value={payerEin}
                             onChange={(e) => {
                               const formatted = formatEin(e.target.value);
                               setPayerEin(formatted);
                             }}
                             className={`mt-1 ${useProfileInfoForPayer ? 'opacity-50 pointer-events-none' : ''}`}
                             disabled={useProfileInfoForPayer}
                             maxLength={10}
                           />
                         </div>
                         
                         <div>
                           <Label htmlFor="payer-phone" className="text-sm font-medium text-foreground">
                             Phone Number *
                           </Label>
                          <Input
                            id="payer-phone"
                            placeholder="(xxx) xxx-xxxx"
                            value={payerPhone}
                            onChange={(e) => {
                              const normalized = normalizePhoneInput(e.target.value);
                              setPayerPhone(normalized);
                              if (normalized) clearFieldError('payerPhone');
                            }}
                            className={`mt-1 ${useProfileInfoForPayer ? 'opacity-50 pointer-events-none' : ''} ${errors.payerPhone ? 'ring-2 ring-destructive border-destructive' : ''}`}
                            disabled={useProfileInfoForPayer}
                            data-error={!!errors.payerPhone}
                          />
                          {errors.payerPhone && (
                            <p className="text-sm text-destructive mt-1">{errors.payerPhone}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="payer-email" className="text-sm font-medium text-foreground">
                            Email *
                          </Label>
                          <Input
                            id="payer-email"
                            type="email"
                            placeholder="Enter email address"
                            value={payerEmail}
                            onChange={(e) => {
                              setPayerEmail(e.target.value);
                              if (e.target.value) clearFieldError('payerEmail');
                            }}
                            className={`mt-1 ${useProfileInfoForPayer ? 'opacity-50 pointer-events-none' : ''} ${errors.payerEmail ? 'ring-2 ring-destructive border-destructive' : ''}`}
                            disabled={useProfileInfoForPayer}
                            data-error={!!errors.payerEmail}
                          />
                          {errors.payerEmail && (
                            <p className="text-sm text-destructive mt-1">{errors.payerEmail}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="payer-address" className="text-sm font-medium text-foreground">
                            Address *
                           </Label>
                          <RestPlacesAutocomplete
                            placeholder="Start typing your address..."
                            onAddressSelect={useProfileInfoForPayer ? () => {} : handlePayerAddressSelect}
                            value={payerAddressDisplay}
                            onChange={useProfileInfoForPayer ? () => {} : (value) => {
                              setPayerAddressDisplay(value);
                              if (value) clearFieldError('payerAddress');
                            }}
                            className={`mt-1 ${useProfileInfoForPayer ? 'opacity-50 pointer-events-none' : ''} ${errors.payerAddress ? 'ring-2 ring-destructive border-destructive' : ''}`}
                            data-error={!!errors.payerAddress}
                          />
                          {errors.payerAddress && (
                            <p className="text-sm text-destructive mt-1">{errors.payerAddress}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <Card className="animate-fade-in">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Tax Calculation - {taxType}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Tax Calculation Forms */}
                      {taxType === 'Food & Beverage' && (
                        <FoodBeverageTaxForm
                          data={foodBeverageTaxData}
                          onChange={setFoodBeverageTaxData}
                          disabled={false}
                        />
                      )}
                      
                      {taxType === 'Hotel & Motel' && (
                        <HotelMotelTaxForm
                          data={hotelMotelTaxData}
                          onChange={setHotelMotelTaxData}
                          disabled={false}
                        />
                      )}
                      
                      {taxType === 'Amusement' && (
                        <AmusementTaxForm
                          data={amusementTaxData}
                          onChange={setAmusementTaxData}
                          disabled={false}
                        />
                      )}
                      
                      {!taxType && (
                        <div className="text-center text-muted-foreground py-8">
                          Please select a tax type in step 1 to continue with the calculation.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Document Upload Section */}
                  <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Supporting Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Upload any supporting documents for your tax submission (receipts, reports, etc.)
                        </p>
                        
                        {/* File Upload Zone */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                            dragActive 
                              ? 'border-primary bg-primary/5' 
                              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25'
                          }`}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            setDragActive(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setDragActive(false);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragActive(false);
                            // Handle file drop - simplified for now
                            const files = Array.from(e.dataTransfer.files);
                            files.forEach(file => {
                              const newDoc = {
                                id: crypto.randomUUID(),
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                uploadStatus: 'completed'
                              };
                              setUploadedDocuments(prev => [...prev, newDoc]);
                            });
                          }}
                        >
                          <div className="space-y-2">
                            <div className="text-sm">
                              <label htmlFor="tax-file-upload" className="text-primary hover:text-primary/80 cursor-pointer font-medium">
                                Click to upload
                              </label>
                              <span className="text-muted-foreground"> or drag and drop</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB each)
                            </p>
                          </div>
                          <input
                            id="tax-file-upload"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              files.forEach(file => {
                                const newDoc = {
                                  id: crypto.randomUUID(),
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                  uploadStatus: 'completed'
                                };
                                setUploadedDocuments(prev => [...prev, newDoc]);
                              });
                            }}
                          />
                        </div>
                        
                        {/* Uploaded Files List */}
                        {uploadedDocuments.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-foreground">
                              Uploaded Files ({uploadedDocuments.length})
                            </Label>
                            {uploadedDocuments.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                                    <span className="text-xs font-medium text-primary">
                                      {doc.name.split('.').pop()?.toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{doc.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(doc.size / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setUploadedDocuments(prev => prev.filter(d => d.id !== doc.id));
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Tax Details Summary */}
                  <Card className="animate-fade-in">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Tax Details Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Municipality:</span>
                          <p className="font-medium">{selectedMunicipality?.merchant_name || 'Not selected'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tax Type:</span>
                          <p className="font-medium">{taxType || 'Not selected'}</p>
                        </div>
                      </div>
                      
                      {/* Tax Calculation Summary */}
                      {taxType && (
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium mb-3">Tax Calculation</h4>
                          {taxType === 'Food & Beverage' && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Gross Sales:</span>
                                <span>{formatCurrency(parseFloat(foodBeverageTaxData.grossSales) || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Deductions:</span>
                                <span>{formatCurrency(parseFloat(foodBeverageTaxData.deductions) || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Taxable Receipts:</span>
                                <span>{formatCurrency(parseFloat(foodBeverageTaxData.taxableReceipts) || 0)}</span>
                              </div>
                              <div className="flex justify-between font-medium pt-2 border-t">
                                <span>Total Tax Due:</span>
                                <span>{formatCurrency(parseFloat(foodBeverageTaxData.totalDue) || 0)}</span>
                              </div>
                            </div>
                          )}
                          
                          {taxType === 'Hotel & Motel' && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Monthly Receipts:</span>
                                <span>{formatCurrency(parseFloat(hotelMotelTaxData.line1) || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Net Receipts:</span>
                                <span>{formatCurrency(parseFloat(hotelMotelTaxData.line3) || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Municipal Tax:</span>
                                <span>{formatCurrency(parseFloat(hotelMotelTaxData.line4) || 0)}</span>
                              </div>
                              <div className="flex justify-between font-medium pt-2 border-t">
                                <span>Total Payment Due:</span>
                                <span>{formatCurrency(parseFloat(hotelMotelTaxData.line8) || 0)}</span>
                              </div>
                            </div>
                          )}
                          
                          {taxType === 'Amusement' && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Net Receipts:</span>
                                <span>{formatCurrency(parseFloat(amusementTaxData.netReceipts) || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Deductions:</span>
                                <span>{formatCurrency(parseFloat(amusementTaxData.deductions) || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Taxable Receipts:</span>
                                <span>{formatCurrency(parseFloat(amusementTaxData.taxableReceipts) || 0)}</span>
                              </div>
                              <div className="flex justify-between font-medium pt-2 border-t">
                                <span>Total Tax Due:</span>
                                <span>{formatCurrency(parseFloat(amusementTaxData.totalDue) || 0)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payer Information Summary */}
                  <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Payer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name/Company:</span>
                          <p className="font-medium">{payerName || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">EIN:</span>
                          <p className="font-medium">{payerEin || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{payerEmail || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium">{payerPhone || 'Not provided'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Address:</span>
                          <p className="font-medium">{payerAddressDisplay || 'Not provided'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documents Summary */}
                  {uploadedDocuments.length > 0 && (
                    <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          Uploaded Documents ({uploadedDocuments.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {uploadedDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {doc.name.split('.').pop()?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(doc.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment Summary */}
                  <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Payment Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PaymentSummary
                        baseAmount={getTaxAmountInCents()}
                        serviceFee={serviceFee}
                        selectedPaymentMethod={selectedPaymentMethod || "card"}
                      />
                    </CardContent>
                  </Card>

                  {/* Separator */}
                  <div className="border-t border-border"></div>

                  {/* Payment Method Selection */}
                  <Card className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <PaymentMethodSelector
                        paymentInstruments={topPaymentMethods}
                        selectedPaymentMethod={selectedPaymentMethod}
                        onSelectPaymentMethod={setSelectedPaymentMethod}
                        isLoading={paymentMethodsLoading}
                        maxMethods={3}
                      />

                      {/* Payment Options - Side by Side */}
                      {selectedMunicipality && getTaxAmountInCents() > 0 && googlePayMerchantId && (
                        <PaymentButtonsContainer
                          bill={{
                            ...selectedMunicipality,
                            taxType,
                            amount: getTaxAmountInCents()
                          }}
                          totalAmount={totalWithFee}
                          merchantId={googlePayMerchantId}
                          isDisabled={isProcessingPayment}
                          onGooglePayment={handleGooglePayment}
                          onApplePayment={handleApplePayment}
                        />
                      )}
                      
                      {/* Show message when Google Pay is not available */}
                      {(!selectedMunicipality || !googlePayMerchantId) && (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          Alternative payment methods are not available for this tax payment.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Separator */}
                  <div className="border-t border-border"></div>

                  {/* Pay Now Section */}
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      size="lg"
                      disabled={!selectedPaymentMethod || isProcessingPayment || selectedPaymentMethod === 'google-pay' || selectedPaymentMethod === 'apple-pay'}
                      onClick={handleSubmit}
                    >
                      {isProcessingPayment ? 'Processing...' : 
                       selectedPaymentMethod === 'google-pay' ? 'Use Google Pay button above' : 
                       selectedPaymentMethod === 'apple-pay' ? 'Use Apple Pay button above' :
                       `Pay ${formatCurrency(totalWithFee / 100)}`}
                    </Button>
                   
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="lg"
                      onClick={() => setIsAddPaymentMethodOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Payment Method
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Your payment will be processed securely
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

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
              <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              {currentStep < totalSteps && (
                <Button onClick={handleNext} className="flex items-center space-x-2">
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      
      <AddPaymentMethodDialog
        open={isAddPaymentMethodOpen}
        onOpenChange={setIsAddPaymentMethodOpen}
        onSuccess={handleAddPaymentMethodSuccess}
      />
    </Dialog>
  );
};