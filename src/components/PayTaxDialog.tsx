import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { normalizePhoneInput } from '@/lib/phoneUtils';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { AddPaymentMethodDialog } from './profile/AddPaymentMethodDialog';
import { TaxDocumentUpload } from './TaxDocumentUpload';
import { useTaxSubmissionDocuments } from '@/hooks/useTaxSubmissionDocuments';
import { useMunicipalTaxTypes } from '@/hooks/useMunicipalTaxTypes';
import { InlinePaymentFlow } from './payment/InlinePaymentFlow';
import { supabase } from '@/integrations/supabase/client';

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
    tax_type_name: string;
    tax_type_code: string;
    instructions_document_path?: string;
  } | null>(null);

  // Submission state and errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Add payment method dialog state
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);

  // Tax submission state for unified payment
  const [taxSubmissionId, setTaxSubmissionId] = useState<string | null>(null);
  const [isCreatingSubmission, setIsCreatingSubmission] = useState(false);

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

  const createTaxSubmission = async () => {
    if (!selectedMunicipality || !profile || !payerAddress) {
      throw new Error('Missing required data for tax submission');
    }

    setIsCreatingSubmission(true);
    try {
      // Prepare calculation data
      const calculationData = {
        calculationNotes,
        totalAmountDue,
        reportingPeriodStart: getCurrentTaxPeriodStart(),
        reportingPeriodEnd: getCurrentTaxPeriodEnd(),
        taxYear: getCurrentTaxYear()
      };

      // Create tax submission using the existing RPC function
      const { data, error } = await supabase.rpc('create_tax_submission_with_payment', {
        p_user_id: profile.id,
        p_customer_id: selectedMunicipality.customer_id,
        p_merchant_id: selectedMunicipality.id,
        p_tax_type: taxType,
        p_tax_period_start: getCurrentTaxPeriodStart(),
        p_tax_period_end: getCurrentTaxPeriodEnd(),
        p_tax_year: getCurrentTaxYear(),
        p_amount_cents: getTaxAmountInCents(),
        p_calculation_data: calculationData,
        p_payment_instrument_id: '', // Will be set by unified payment
        p_finix_merchant_id: selectedMunicipality.finix_merchant_id,
        p_service_fee_cents: 0, // Will be calculated by unified payment
        p_total_amount_cents: getTaxAmountInCents(),
        p_payment_type: 'pending',
        p_idempotency_id: crypto.randomUUID(),
        p_first_name: payerName.split(' ')[0] || '',
        p_last_name: payerName.split(' ').slice(1).join(' ') || '',
        p_user_email: payerEmail,
        p_payer_ein: payerEin,
        p_payer_phone: payerPhone,
        p_payer_street_address: payerAddress.streetAddress,
        p_payer_city: payerAddress.city,
        p_payer_state: payerAddress.state,
        p_payer_zip_code: payerAddress.zipCode,
        p_payer_business_name: payerName.includes('LLC') || payerName.includes('Inc') || payerName.includes('Corp') ? payerName : undefined
      });

      if (error) {
        throw new Error(`Failed to create tax submission: ${error.message}`);
      }

      if (data && typeof data === 'object' && 'success' in data && 'tax_submission_id' in data) {
        const result = data as { success: boolean; tax_submission_id: string };
        setTaxSubmissionId(result.tax_submission_id);
        return result.tax_submission_id;
      } else {
        throw new Error('Failed to create tax submission: Invalid response');
      }
    } catch (error: any) {
      console.error('Error creating tax submission:', error);
      throw error;
    } finally {
      setIsCreatingSubmission(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    // If moving to step 3 (payment), create the tax submission first
    if (currentStep === 2 && !taxSubmissionId) {
      try {
        await createTaxSubmission();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to prepare tax submission for payment.",
          variant: "destructive",
        });
        return;
      }
    }

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
    
    // Reset tax submission state
    setTaxSubmissionId(null);
    setIsCreatingSubmission(false);
    
    setErrors({});
    setIsSubmitting(false);
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
    setIsAddPaymentMethodOpen(false);
    toast({
      title: "Payment method added",
      description: "Your new payment method has been added successfully.",
    });
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Tax Payment Complete",
      description: uploadedDocuments.length > 0 
        ? `Your tax payment has been processed and ${uploadedDocuments.length} document(s) confirmed.`
        : "Your tax payment has been processed successfully.",
    });
    
    onOpenChange(false);
    resetForm();
  };

  const handlePaymentError = (error: any) => {
    console.error('Tax payment failed:', error);
    toast({
      title: "Payment Failed",
      description: error.message || "An error occurred while processing your payment. Please try again.",
      variant: "destructive",
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
                  {step}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {step === 1 ? 'Tax Information' : step === 2 ? 'Calculation & Docs' : 'Payment'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {step === 1 ? 'Basic details' : step === 2 ? 'Amount & documents' : 'Complete payment'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Step 1: Tax Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                {/* Municipality Selection */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Select Municipality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="municipality">Municipality *</Label>
                        <BuildingPermitsMunicipalityAutocomplete
                          value={selectedMunicipality?.merchant_name || ''}
                          onSelect={(municipality) => {
                            setSelectedMunicipality(municipality);
                            clearFieldError('municipality');
                          }}
                          placeholder="Search for your municipality..."
                        />
                        {errors.municipality && (
                          <p className="text-sm text-destructive">{errors.municipality}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Type Selection */}
                {selectedMunicipality && (
                  <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Tax Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tax-type">Tax Type *</Label>
                          <Select 
                            value={taxType} 
                            onValueChange={(value) => {
                              setTaxType(value);
                              // Find the tax type data
                              const typeData = availableTaxTypes.find(t => t.tax_type_name === value);
                              setSelectedTaxTypeData(typeData || null);
                              clearFieldError('taxType');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select tax type" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTaxTypes.map((type) => (
                                <SelectItem key={type.tax_type_name} value={type.tax_type_name}>
                                  {type.tax_type_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.taxType && (
                            <p className="text-sm text-destructive">{errors.taxType}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="reporting-period-start">Reporting Period Start *</Label>
                            <Input
                              id="reporting-period-start"
                              type="date"
                              value={reportingPeriodStart}
                              onChange={(e) => {
                                setReportingPeriodStart(e.target.value);
                                clearFieldError('reportingPeriodStart');
                              }}
                              className={cn(errors.reportingPeriodStart && "border-destructive")}
                            />
                            {errors.reportingPeriodStart && (
                              <p className="text-sm text-destructive">{errors.reportingPeriodStart}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reporting-period-end">Reporting Period End *</Label>
                            <Input
                              id="reporting-period-end"
                              type="date"
                              value={reportingPeriodEnd}
                              onChange={(e) => {
                                setReportingPeriodEnd(e.target.value);
                                clearFieldError('reportingPeriodEnd');
                              }}
                              className={cn(errors.reportingPeriodEnd && "border-destructive")}
                            />
                            {errors.reportingPeriodEnd && (
                              <p className="text-sm text-destructive">{errors.reportingPeriodEnd}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payer Information */}
                {selectedMunicipality && taxType && (
                  <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        Payer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                          <Switch
                            id="use-profile-info"
                            checked={useProfileInfoForPayer}
                            onCheckedChange={handleUseProfileInfoForPayerToggle}
                          />
                          <Label htmlFor="use-profile-info" className="text-sm font-normal cursor-pointer">
                            Use my profile information for payer details
                          </Label>
                        </div>

                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="payer-name">Payer Name *</Label>
                            <Input
                              id="payer-name"
                              value={payerName}
                              onChange={(e) => {
                                setPayerName(e.target.value);
                                clearFieldError('payerName');
                              }}
                              placeholder="Full name or business name"
                              className={cn(errors.payerName && "border-destructive")}
                            />
                            {errors.payerName && (
                              <p className="text-sm text-destructive">{errors.payerName}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="payer-ein">EIN (if applicable)</Label>
                            <Input
                              id="payer-ein"
                              value={payerEin}
                              onChange={(e) => setPayerEin(formatEin(e.target.value))}
                              placeholder="XX-XXXXXXX"
                              maxLength={10}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="payer-email">Email *</Label>
                              <Input
                                id="payer-email"
                                type="email"
                                value={payerEmail}
                                onChange={(e) => {
                                  setPayerEmail(e.target.value);
                                  clearFieldError('payerEmail');
                                }}
                                placeholder="email@example.com"
                                className={cn(errors.payerEmail && "border-destructive")}
                              />
                              {errors.payerEmail && (
                                <p className="text-sm text-destructive">{errors.payerEmail}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="payer-phone">Phone *</Label>
                              <Input
                                id="payer-phone"
                                type="tel"
                                value={payerPhone}
                                onChange={(e) => {
                                  setPayerPhone(normalizePhoneInput(e.target.value));
                                  clearFieldError('payerPhone');
                                }}
                                placeholder="(555) 123-4567"
                                className={cn(errors.payerPhone && "border-destructive")}
                              />
                              {errors.payerPhone && (
                                <p className="text-sm text-destructive">{errors.payerPhone}</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="payer-address">Address *</Label>
                            <RestPlacesAutocomplete
                              value={payerAddressDisplay}
                              onChange={setPayerAddressDisplay}
                              onAddressSelect={handlePayerAddressSelect}
                              placeholder="Enter street address, city, state"
                              className={cn(errors.payerAddress && "border-destructive")}
                            />
                            {errors.payerAddress && (
                              <p className="text-sm text-destructive">{errors.payerAddress}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 2: Calculation & Documents */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                {/* Tax Calculation */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Tax Calculation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="calculation-notes">Calculation Details *</Label>
                        <RichTextEditor
                          content={calculationNotes}
                          onChange={(value) => {
                            setCalculationNotes(value);
                            clearFieldError('calculationNotes');
                          }}
                          placeholder="Describe how the tax amount was calculated..."
                          className={cn(errors.calculationNotes && "border-destructive")}
                        />
                        {errors.calculationNotes && (
                          <p className="text-sm text-destructive">{errors.calculationNotes}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="total-amount-due">Total Amount Due *</Label>
                        <Input
                          id="total-amount-due"
                          type="number"
                          step="0.01"
                          min="0"
                          value={totalAmountDue}
                          onChange={(e) => {
                            setTotalAmountDue(e.target.value);
                            clearFieldError('totalAmountDue');
                          }}
                          placeholder="0.00"
                          className={cn(errors.totalAmountDue && "border-destructive")}
                        />
                        {errors.totalAmountDue && (
                          <p className="text-sm text-destructive">{errors.totalAmountDue}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Upload */}
                <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Supporting Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaxDocumentUpload
                      documents={uploadedDocuments}
                      uploadDocument={uploadDocument}
                      deleteDocument={deleteDocument}
                      uploadProgress={uploadProgress}
                      uploadStates={uploadStates}
                      clearFailedUpload={clearFailedUpload}
                      isUploading={isUploading}
                      isDeleting={isDeleting}
                      onDocumentsChange={setUploadedDocuments}
                      allUploadsComplete={allUploadsComplete}
                      hasUploadingDocuments={hasUploadingDocuments}
                      uploadingDocumentsCount={uploadingDocumentsCount}
                    />
                    {errors.documentsUploading && (
                      <p className="text-sm text-destructive mt-2">{errors.documentsUploading}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Uploaded Documents List */}
                {uploadedDocuments.length > 0 && (
                  <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
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
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && taxSubmissionId && (
              <div className="space-y-6 animate-fade-in">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Complete Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InlinePaymentFlow
                      entityType="tax_submission"
                      entityId={taxSubmissionId}
                      entityName={`${taxType} Tax`}
                      customerId={profile?.id || ''}
                      merchantId={selectedMunicipality?.id || ''}
                      baseAmountCents={getTaxAmountInCents()}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      onAddPaymentMethod={() => setIsAddPaymentMethodOpen(true)}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Loading state for creating submission */}
            {currentStep === 3 && !taxSubmissionId && isCreatingSubmission && (
              <div className="space-y-6 animate-fade-in">
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                      <div>
                        <h3 className="font-medium">Preparing your tax submission...</h3>
                        <p className="text-sm text-muted-foreground">Please wait while we set up your payment.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
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
                  disabled={(currentStep === 2 && hasUploadingDocuments) || isCreatingSubmission}
                >
                  {isCreatingSubmission ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Preparing...</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
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