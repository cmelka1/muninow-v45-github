import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
// Removed calendar and popover imports - using text inputs for dates

import { BuildingPermitsMunicipalityAutocomplete } from '@/components/ui/building-permits-municipality-autocomplete';
import { RestPlacesAutocomplete } from '@/components/ui/rest-places-autocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import PaymentSummary from './PaymentSummary';
import { formatCurrency } from '@/lib/formatters';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentButtonsContainer from './PaymentButtonsContainer';
import { useTaxPaymentMethods } from '@/hooks/useTaxPaymentMethods';
import { AddPaymentMethodDialog } from './profile/AddPaymentMethodDialog';
import { TaxDocumentUpload } from './TaxDocumentUpload';
import { useTaxSubmissionDocuments } from '@/hooks/useTaxSubmissionDocuments';
import { useMunicipalTaxTypes } from '@/hooks/useMunicipalTaxTypes';


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
  finix_merchant_id: string;
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
  
  // Reporting Period (using strings for text input)
  const [reportingPeriodStart, setReportingPeriodStart] = useState<string>('');
  const [reportingPeriodEnd, setReportingPeriodEnd] = useState<string>('');

  // Payer Information
  const [payerName, setPayerName] = useState('');
  const [payerEin, setPayerEin] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerAddress, setPayerAddress] = useState<AddressComponents | null>(null);
  const [payerAddressDisplay, setPayerAddressDisplay] = useState('');
  const [useProfileInfoForPayer, setUseProfileInfoForPayer] = useState(false);

  // Simplified Tax Data
  const [calculationNotes, setCalculationNotes] = useState('');
  const [totalAmountDue, setTotalAmountDue] = useState('');

  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{
    id: string;
    file_name: string;
    original_file_name: string;
    document_type: string;
    description: string | null;
    file_size: number;
    content_type: string;
    upload_progress: number;
    status: 'staged' | 'confirmed' | 'failed';
    created_at: string;
  }>>([]);
  const [dragActive, setDragActive] = useState(false);

  // Generate staging ID for document uploads
  const [stagingId] = useState(() => crypto.randomUUID());

  // Fetch dynamic tax types for selected municipality
  const { data: availableTaxTypes = [] } = useMunicipalTaxTypes(selectedMunicipality?.customer_id);
  const [selectedTaxTypeData, setSelectedTaxTypeData] = useState<{
    name: string;
    code: string;
    instructions_document_path?: string;
  } | null>(null);

  // Submission state and errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Add payment method dialog state
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);

  // Document upload functionality - using new staging system
  const { 
    uploadDocument,
    deleteDocument,
    uploadProgress,
    uploadStates,
    clearFailedUpload,
    isUploading,
    isDeleting,
    cleanupStagingArea, 
    allUploadsComplete, 
    hasUploadingDocuments,
    uploadingDocumentsCount 
  } = useTaxSubmissionDocuments(stagingId);


  // Helper function to parse formatted numbers (removes commas)
  const parseFormattedNumber = (value: string) => {
    return parseFloat(value.replace(/,/g, '') || '0');
  };

  // Tax amount calculation for payment methods
  const getTaxAmountInCents = () => {
    return Math.round((parseFormattedNumber(totalAmountDue) || 0) * 100);
  };

  const getCurrentTaxCalculationData = () => {
    return {
      calculationNotes,
      totalAmountDue
    };
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
    if (reportingPeriodStart) {
      return reportingPeriodStart;
    }
    // Fallback to current year start
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const getCurrentTaxPeriodEnd = () => {
    if (reportingPeriodEnd) {
      return reportingPeriodEnd;
    }
    // Fallback to current year end  
    const now = new Date();
    return `${now.getFullYear()}-12-31`;
  };

  const getCurrentTaxYear = () => {
    if (reportingPeriodEnd) {
      const endDate = new Date(reportingPeriodEnd);
      if (!isNaN(endDate.getTime())) {
        return endDate.getFullYear();
      }
    }
    // Fallback to current year if no valid reporting period end date
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
    taxYear: getCurrentTaxYear(),
    stagingId: stagingId // Pass staging ID for document confirmation
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
    if (!reportingPeriodStart.trim()) e.reportingPeriodStart = 'Reporting period start date is required';
    if (!reportingPeriodEnd.trim()) e.reportingPeriodEnd = 'Reporting period end date is required';
    
    // Validate date format and comparison
    if (reportingPeriodStart && reportingPeriodEnd) {
      const startDate = new Date(reportingPeriodStart);
      const endDate = new Date(reportingPeriodEnd);
      
      if (isNaN(startDate.getTime())) {
        e.reportingPeriodStart = 'Please enter a valid date (MM/DD/YYYY or YYYY-MM-DD)';
      }
      if (isNaN(endDate.getTime())) {
        e.reportingPeriodEnd = 'Please enter a valid date (MM/DD/YYYY or YYYY-MM-DD)';
      }
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
        e.reportingPeriodEnd = 'End date must be after start date';
      }
    }
    
    if (!payerName.trim()) e.payerName = 'Full name is required';
    if (!payerEmail.trim()) e.payerEmail = 'Email is required';
    if (!payerPhone.trim()) e.payerPhone = 'Phone is required';
    if (!payerAddress) e.payerAddress = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!calculationNotes.trim()) e.calculationNotes = 'Calculation details are required';
    if (!totalAmountDue.trim()) e.totalAmountDue = 'Total amount due is required';
    if (totalAmountDue && (isNaN(parseFormattedNumber(totalAmountDue)) || parseFormattedNumber(totalAmountDue) <= 0)) {
      e.totalAmountDue = 'Please enter a valid amount greater than 0';
    }
    
    // Check if documents are still uploading
    if (hasUploadingDocuments) {
      e.documentsUploading = `Please wait for ${uploadingDocumentsCount} document${uploadingDocumentsCount > 1 ? 's' : ''} to finish uploading`;
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
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
    setReportingPeriodStart('');
    setReportingPeriodEnd('');
    setPayerName('');
    setPayerEin('');
    setPayerEmail('');
    setPayerPhone('');
    setPayerAddress(null);
    setPayerAddressDisplay('');
    setUseProfileInfoForPayer(false);
    setUploadedDocuments([]);
    setDragActive(false);
    
    // Cleanup staging area for documents
    if (uploadedDocuments.length > 0) {
      cleanupStagingArea();
    }
    
    // Reset simplified tax data
    setCalculationNotes('');
    setTotalAmountDue('');
    
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      scrollTop();
      return;
    }

    if (!validateStep2()) {
      setCurrentStep(2);
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
      // Process payment - staging_id will be handled by the payment hook
      const paymentResult = await handlePayment();
      
      if (paymentResult) {
        toast({
          title: "Tax Payment Complete",
          description: uploadedDocuments.length > 0 
            ? `Your tax payment has been processed and ${uploadedDocuments.length} document(s) confirmed.`
            : "Your tax payment has been processed successfully.",
        });
        
        onOpenChange(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Tax payment failed:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "An error occurred while processing your payment. Please try again.",
        variant: "destructive",
      });
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
                        <Select 
                          value={taxType} 
                          onValueChange={(value) => {
                            setTaxType(value);
                            // Find the selected tax type data for displaying instructions
                            const selectedType = availableTaxTypes.find(t => t.tax_type_code === value);
                            if (selectedType) {
                              setSelectedTaxTypeData({
                                name: selectedType.tax_type_name,
                                code: selectedType.tax_type_code,
                                instructions_document_path: selectedType.instructions_document_path,
                              });
                            }
                          }}
                        >
                          <SelectTrigger aria-label="Tax type">
                            <SelectValue placeholder="Select tax type" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {availableTaxTypes.map((taxType) => (
                              <SelectItem key={taxType.id} value={taxType.tax_type_code}>
                                {taxType.tax_type_name}
                              </SelectItem>
                            ))}
                            {availableTaxTypes.length === 0 && selectedMunicipality && (
                              <SelectItem value="" disabled>
                                No tax types available for this municipality
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.taxType && <p className="text-sm text-destructive">{errors.taxType}</p>}
                        
                        {/* Show tax type instructions if available */}
                        {selectedTaxTypeData?.instructions_document_path && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md border">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Tax Instructions Available</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Instructions document available for {selectedTaxTypeData.name}
                            </p>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              View Instructions
                            </Button>
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Reporting Period *</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Period Start Date</Label>
                            <Input
                              type="date"
                              value={reportingPeriodStart}
                              onChange={(e) => {
                                setReportingPeriodStart(e.target.value);
                                if (e.target.value) clearFieldError('reportingPeriodStart');
                              }}
                              className={cn(
                                errors.reportingPeriodStart && "border-destructive focus-visible:ring-destructive"
                              )}
                              placeholder="YYYY-MM-DD"
                            />
                            {errors.reportingPeriodStart && <p className="text-sm text-destructive">{errors.reportingPeriodStart}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label>Period End Date</Label>
                            <Input
                              type="date"
                              value={reportingPeriodEnd}
                              onChange={(e) => {
                                setReportingPeriodEnd(e.target.value);
                                if (e.target.value) clearFieldError('reportingPeriodEnd');
                              }}
                              className={cn(
                                errors.reportingPeriodEnd && "border-destructive focus-visible:ring-destructive"
                              )}
                              placeholder="YYYY-MM-DD"
                            />
                            {errors.reportingPeriodEnd && <p className="text-sm text-destructive">{errors.reportingPeriodEnd}</p>}
                          </div>
                        </div>
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
                             className={`mt-1 ${errors.payerName ? 'ring-2 ring-destructive border-destructive' : ''}`}
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
                              className="mt-1"
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
                             className={`mt-1 ${errors.payerPhone ? 'ring-2 ring-destructive border-destructive' : ''}`}
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
                             className={`mt-1 ${errors.payerEmail ? 'ring-2 ring-destructive border-destructive' : ''}`}
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
                             onAddressSelect={handlePayerAddressSelect}
                             value={payerAddressDisplay}
                             onChange={(value) => {
                               setPayerAddressDisplay(value);
                               if (value) clearFieldError('payerAddress');
                             }}
                             className={`mt-1 ${errors.payerAddress ? 'ring-2 ring-destructive border-destructive' : ''}`}
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
                    <CardContent className="space-y-4">
                      {taxType ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">
                            Please download the appropriate tax form from your municipality, complete your calculations, 
                            and provide the details below along with supporting documents.
                          </p>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="calculation-notes" className="text-sm font-medium">
                                Calculation Details / Notes *
                              </Label>
                              <RichTextEditor
                                content={calculationNotes}
                                onChange={(content) => {
                                  setCalculationNotes(content);
                                  if (content.trim()) clearFieldError('calculationNotes');
                                }}
                                placeholder="Enter your tax calculation details, breakdown, or any notes about your submission..."
                                error={!!errors.calculationNotes}
                                className="mt-1"
                              />
                              {errors.calculationNotes && (
                                <p className="text-sm text-destructive mt-1">{errors.calculationNotes}</p>
                              )}
                            </div>
                            
                            <div>
                              <Label htmlFor="total-amount-due" className="text-sm font-medium">
                                Total Amount Due ($) *
                              </Label>
                              <Input
                                id="total-amount-due"
                                type="text"
                                placeholder="0.00"
                                value={totalAmountDue}
                                onChange={(e) => {
                                  // Remove all non-digits and non-decimal points
                                  const numericValue = e.target.value.replace(/[^\d.]/g, '');
                                  
                                  // Format with commas for display
                                  const parts = numericValue.split('.');
                                  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                  const formattedValue = parts.join('.');
                                  
                                  setTotalAmountDue(formattedValue);
                                  if (numericValue.trim()) clearFieldError('totalAmountDue');
                                }}
                                className={`mt-1 ${errors.totalAmountDue ? 'border-destructive ring-2 ring-destructive' : ''}`}
                              />
                              {errors.totalAmountDue && (
                                <p className="text-sm text-destructive mt-1">{errors.totalAmountDue}</p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          Please select a tax type in step 1 to continue.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Document Upload Section */}
                  <TaxDocumentUpload
                    documents={uploadedDocuments}
                    onDocumentsChange={setUploadedDocuments}
                    disabled={false}
                    stagingId={stagingId}
                    uploadDocument={uploadDocument}
                    deleteDocument={deleteDocument}
                    uploadProgress={uploadProgress}
                    uploadStates={uploadStates}
                    clearFailedUpload={clearFailedUpload}
                    isUploading={isUploading}
                    isDeleting={isDeleting}
                    allUploadsComplete={allUploadsComplete}
                    hasUploadingDocuments={hasUploadingDocuments}
                    uploadingDocumentsCount={uploadingDocumentsCount}
                  />
                  {/* Display upload status error if present */}
                  {errors.documentsUploading && (
                    <p className="text-sm text-destructive mt-2">{errors.documentsUploading}</p>
                  )}
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
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Reporting Period:</span>
                          <p className="font-medium">
                            {reportingPeriodStart && reportingPeriodEnd ? 
                              `${reportingPeriodStart} - ${reportingPeriodEnd}` : 
                              'Not selected'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Tax Calculation Summary */}
                      {taxType && calculationNotes && totalAmountDue && (
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium mb-3">Tax Calculation Summary</h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-muted-foreground block mb-1">Calculation Details:</span>
                              <p className="whitespace-pre-wrap bg-background p-2 rounded border text-sm">
                                {calculationNotes}
                              </p>
                            </div>
                            <div className="flex justify-between font-medium pt-2 border-t">
                              <span>Total Amount Due:</span>
                              <span>{formatCurrency(parseFormattedNumber(totalAmountDue) || 0)}</span>
                            </div>
                          </div>
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
                          {uploadedDocuments.map((doc, index) => (
                            <div key={doc.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {doc.original_file_name.split('.').pop()?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{doc.original_file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.document_type.replace('_', ' ')} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                {doc.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                                )}
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
                        selectedPaymentMethod={selectedPaymentMethod}
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
                <Button 
                  onClick={handleNext} 
                  className="flex items-center space-x-2"
                  disabled={currentStep === 2 && hasUploadingDocuments}
                >
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