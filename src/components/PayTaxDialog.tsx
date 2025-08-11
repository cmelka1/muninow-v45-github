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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizePhoneInput } from '@/lib/phoneUtils';
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
  const totalSteps = 2;
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
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerAddress, setPayerAddress] = useState<AddressComponents | null>(null);
  const [payerAddressDisplay, setPayerAddressDisplay] = useState('');
  const [useProfileInfoForPayer, setUseProfileInfoForPayer] = useState(false);

  // Submission state and errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setPayerEmail('');
    setPayerPhone('');
    setPayerAddress(null);
    setPayerAddressDisplay('');
    setUseProfileInfoForPayer(false);
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      scrollTop();
      return;
    }

    setIsSubmitting(true);
    try {
      toast({
        title: 'Pay Tax form ready',
        description: 'Payment flow will be connected next. Your details are captured.',
      });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err?.message || 'Please try again', variant: 'destructive' });
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
            {[1, 2].map((step) => (
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
                    {step === 2 && 'Review & Confirm'}
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
                          <p className="text-xs text-muted-foreground mb-2">
                            Enter your full name or company name
                          </p>
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
                          <Label htmlFor="payer-phone" className="text-sm font-medium text-foreground">
                            Phone Number *
                          </Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Enter your contact phone number
                          </p>
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
                          <p className="text-xs text-muted-foreground mb-2">
                            Enter your email address
                          </p>
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
                          <p className="text-xs text-muted-foreground mb-2">
                            Enter your mailing address
                          </p>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Review &amp; Confirm</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium">Tax Details</h4>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Municipality</span>
                          <div>
                            {selectedMunicipality
                              ? `${selectedMunicipality.merchant_name || selectedMunicipality.business_name} • ${selectedMunicipality.customer_city}, ${selectedMunicipality.customer_state}`
                              : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tax Type</span>
                          <div>{taxType || '-'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Account / Tax #</span>
                          <div>{accountNumber || '-'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount</span>
                          <div>{amount ? `$${Number(amount).toFixed(2)}` : '-'}</div>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Memo</span>
                          <div>{memo || '-'}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium">Payer Details</h4>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Full Name</span>
                          <div>{payerName || '-'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email</span>
                          <div>{payerEmail || '-'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone</span>
                          <div>{payerPhone || '-'}</div>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-muted-foreground">Address</span>
                          <div>
                            {payerAddress
                              ? `${payerAddress.streetAddress}, ${payerAddress.city}, ${payerAddress.state} ${payerAddress.zipCode}`
                              : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
              {currentStep < totalSteps ? (
                <Button onClick={handleNext} className="flex items-center space-x-2">
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Confirm'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};