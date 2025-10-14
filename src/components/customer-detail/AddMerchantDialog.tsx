import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MERCHANT_CATEGORIES, CATEGORY_OPTIONS } from '@/constants/merchantCategories';

interface Customer {
  customer_id: string;
  legal_entity_name: string;
  entity_type: string;
  doing_business_as: string;
  first_name: string;
  last_name: string;
  work_email: string;
  entity_phone: string;
  business_address_line1: string;
  business_address_line2?: string;
  business_city: string;
  business_state: string;
  business_zip_code: string;
  business_country: string;
  tax_id: string;
  ownership_type: string;
}

interface AddMerchantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onMerchantCreated: () => void;
}

const step1Schema = z.object({
  merchant_name: z.string().min(1, 'Merchant name is required'),
  statement_descriptor: z.string().min(1, 'Statement descriptor is required').max(22, 'Statement descriptor must be 22 characters or less'),
  data_source_system: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;

interface Step2ExtendedData {
  finix_payment_instrument_id: string;
  bank_last_four: string;
  account_type: string;
  bank_account_holder_name: string;
  bank_account_validation_check: string;
}

export function AddMerchantDialog({ open, onOpenChange, customer, onMerchantCreated }: AddMerchantDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [step1Data, setStep1Data] = useState<(Step1Data & { merchant_id?: string; finix_identity_id?: string }) | null>(null);
  const [step2Data, setStep2Data] = useState<Step2ExtendedData | null>(null);
  const { toast } = useToast();
  const dialogContentRef = useRef<HTMLDivElement>(null);
  
  const [finixBankForm, setFinixBankForm] = useState<any>(null);
  const [isFinixFormReady, setIsFinixFormReady] = useState(false);
  const [finixConfig, setFinixConfig] = useState<{
    applicationId: string;
    environment: 'sandbox' | 'live';
  } | null>(null);

  // Function to scroll dialog content to top
  const scrollToTop = () => {
    if (dialogContentRef.current) {
      dialogContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      merchant_name: customer.doing_business_as || '',
      statement_descriptor: '',
    },
  });

  useEffect(() => {
    const fetchFinixConfig = async () => {
      if (!open) return;
      
      try {
        console.log('🔧 Fetching Finix configuration...');
        const { data, error } = await supabase.functions.invoke('get-finix-config');
        
        if (error) {
          console.error('❌ Finix config error:', error);
          throw error;
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load Finix configuration');
        }
        
        console.log('✅ Finix config loaded:', {
          applicationId: data.applicationId,
          environment: data.environment
        });
        
        setFinixConfig({
          applicationId: data.applicationId,
          environment: data.environment,
        });
      } catch (error) {
        console.error('❌ Error loading Finix config:', error);
        toast({
          title: "Configuration Error",
          description: "Failed to load payment form. Please refresh the page and try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchFinixConfig();
  }, [open]);

  useEffect(() => {
    if (currentStep !== 2 || !finixConfig || !step1Data?.finix_identity_id) {
      return;
    }
    
    if (finixBankForm) {
      try {
        finixBankForm.destroy();
        console.log('🧹 Previous Finix form destroyed');
      } catch (e) {
        console.log('⚠️ Error destroying previous form:', e);
      }
      setFinixBankForm(null);
      setIsFinixFormReady(false);
    }
    
    try {
      console.log('🔧 Initializing Finix BankTokenForm for merchant:', step1Data.merchant_id);
      
      const formStyles = {
        base: {
          fontSize: '14px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          color: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          padding: '10px 12px',
          borderRadius: '6px',
          border: '1px solid hsl(var(--border))',
          '::placeholder': {
            color: 'hsl(var(--muted-foreground))',
          },
        },
        focus: {
          borderColor: 'hsl(var(--ring))',
          outline: '2px solid hsl(var(--ring))',
          outlineOffset: '2px',
        },
        error: {
          borderColor: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive))',
        },
        success: {
          borderColor: 'hsl(var(--success))',
        },
      };
      
      const bankForm = (window as any).Finix.BankTokenForm('merchant-bank-form-container', {
        styles: formStyles,
        showLabels: true,
        showPlaceholders: true,
        requiredFields: ['account_holder_name', 'routing_number', 'account_number', 'account_type'],
        defaultValues: {
          account_holder_name: customer.legal_entity_name || '',
        },
        confirmAccountNumber: true,
        placeholders: {
          account_holder_name: 'Enter account holder name',
          routing_number: '123456789',
          account_number: 'Enter account number',
          account_type: 'Select account type',
        },
        labels: {
          account_holder_name: 'Account Holder Name',
          routing_number: 'Routing Number',
          account_number: 'Account Number',
          account_number_confirmation: 'Confirm Account Number',
          account_type: 'Account Type',
        },
      });
      
      bankForm.on('ready', () => {
        console.log('✅ Finix BankTokenForm ready for merchant onboarding');
        setIsFinixFormReady(true);
      });
      
      bankForm.on('error', (error: any) => {
        console.error('❌ Finix form error:', error);
        toast({
          title: "Form Error",
          description: error.message || "Payment form error. Please check your input.",
          variant: "destructive",
        });
      });
      
      setFinixBankForm(bankForm);
      
      return () => {
        try {
          if (bankForm && typeof bankForm.destroy === 'function') {
            bankForm.destroy();
            console.log('🧹 Finix form cleaned up');
          }
        } catch (e) {
          console.log('⚠️ Error during cleanup:', e);
        }
      };
    } catch (error) {
      console.error('❌ Error initializing Finix form:', error);
      toast({
        title: "Form Initialization Error",
        description: "Failed to load secure payment form. Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  }, [currentStep, finixConfig, step1Data, customer]);

  const handleStep1Submit = async (data: Step1Data) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-finix-customer', {
        body: {
          customer_id: customer.customer_id,
          merchant_name: data.merchant_name,
          statement_descriptor: data.statement_descriptor,
          data_source_system: data.data_source_system,
          category: data.category,
          subcategory: data.subcategory,
        },
      });

      if (error) throw error;

      setStep1Data({
        ...data,
        merchant_id: result.merchant_id,
        finix_identity_id: result.finix_identity_id,
      });
      setCurrentStep(2);
      scrollToTop();
      toast({
        title: "Seller ID Created",
        description: "Step 1 completed successfully. Please provide bank account details.",
      });
    } catch (error) {
      console.error('Error creating seller:', error);
      toast({
        title: "Error",
        description: "Failed to create seller ID. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2TokenizedSubmit = async () => {
    if (!step1Data || !step1Data.merchant_id || !step1Data.finix_identity_id) {
      toast({
        title: "Missing Data",
        description: "Step 1 data is missing. Please go back and complete Step 1.",
        variant: "destructive",
      });
      return;
    }
    
    if (!finixBankForm || !isFinixFormReady) {
      toast({
        title: "Form Not Ready",
        description: "Please wait for the payment form to fully load.",
        variant: "destructive",
      });
      return;
    }
    
    if (!finixConfig) {
      toast({
        title: "Configuration Error",
        description: "Payment configuration is not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔐 Submitting Finix BankTokenForm for tokenization...');
      
      finixBankForm.submit(
        finixConfig.environment,
        finixConfig.applicationId,
        async (err: any, tokenResponse: any) => {
          if (err) {
            console.error('❌ Finix tokenization error:', err);
            toast({
              title: 'Tokenization Error',
              description: err.message || 'Failed to process bank account. Please verify your information and try again.',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
          
          try {
            const tokenData = tokenResponse.data || {};
            const token = tokenData.id;
            
            if (!token || !token.startsWith('TK')) {
              throw new Error('Invalid token received from Finix');
            }
            
            console.log('✅ Finix token received:', token);
            console.log('Token details:', {
              instrument_type: tokenData.instrument_type,
              expires_at: tokenData.expires_at
            });
            
            console.log('📤 Calling create-finix-merchant-payment-instrument-tokenized...');
            const { data: result, error } = await supabase.functions.invoke(
              'create-finix-merchant-payment-instrument-tokenized',
              {
                body: {
                  customer_id: customer.customer_id,
                  merchant_id: step1Data.merchant_id,
                  finix_token: token,
                }
              }
            );
            
            if (error) {
              console.error('❌ Edge function error:', error);
              throw error;
            }
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to create payment instrument');
            }
            
            console.log('✅ Payment instrument created:', {
              id: result.finix_payment_instrument_id,
              validation: result.bank_account_validation_check
            });
            
            setStep2Data({
              finix_payment_instrument_id: result.finix_payment_instrument_id,
              bank_last_four: result.bank_last_four,
              account_type: result.account_type || 'CHECKING',
              bank_account_holder_name: result.account_holder_name || customer.legal_entity_name,
              bank_account_validation_check: result.bank_account_validation_check || 'PENDING',
            });
            
            setCurrentStep(3);
            scrollToTop();
            
            const validationMessage = result.bank_account_validation_check === 'VALID' 
              ? 'Bank account validated successfully.'
              : result.bank_account_validation_check === 'INVALID'
              ? 'Bank account validation failed. Please verify your information.'
              : 'Bank account validation pending.';
            
            toast({
              title: 'Payment Instrument Created',
              description: `Step 2 completed. ${validationMessage} Review and create merchant account.`,
            });
            
            setIsLoading(false);
          } catch (backendError) {
            console.error('❌ Backend error:', backendError);
            toast({
              title: 'Error',
              description: backendError instanceof Error ? backendError.message : 'Failed to create payment instrument. Please try again.',
              variant: 'destructive',
            });
            setIsLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('❌ Error in tokenized submission:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    if (!step1Data) return;
    
    setIsLoading(true);
    try {
      // Step 3: Create merchant account
      const { data: result, error: merchantError } = await supabase.functions.invoke('create-customer-merchant', {
        body: {
          customer_id: customer.customer_id,
          merchant_id: step1Data.merchant_id,
        },
      });

      if (merchantError) throw merchantError;

      toast({
        title: "Merchant Created",
        description: "Merchant onboarding completed successfully!",
      });
      
      onMerchantCreated();
      onOpenChange(false);
      
      // Reset form state
      setCurrentStep(1);
      setStep1Data(null);
      setStep2Data(null);
      step1Form.reset();
    } catch (error) {
      console.error('Error creating merchant:', error);
      toast({
        title: "Error",
        description: "Failed to create merchant account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentStep(1);
    setStep1Data(null);
    setStep2Data(null);
    step1Form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent ref={dialogContentRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Merchant</DialogTitle>
          {/* Progress Indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep} of 3</span>
              <span>
                {currentStep === 1 && "Business Information"}
                {currentStep === 2 && "Bank Account"}
                {currentStep === 3 && "Create Merchant"}
              </span>
            </div>
            <Progress value={(currentStep / 3) * 100} className="h-2" />
          </div>
        </DialogHeader>

        {currentStep === 1 && (
          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Legal Entity Name</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {customer.legal_entity_name}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Entity Type</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {customer.entity_type}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Merchant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="merchant_name">Merchant Name *</Label>
                  <Input
                    id="merchant_name"
                    {...step1Form.register('merchant_name')}
                  />
                  {step1Form.formState.errors.merchant_name && (
                    <p className="text-sm text-destructive mt-1">
                      {step1Form.formState.errors.merchant_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="statement_descriptor">Statement Descriptor *</Label>
                  <Input
                    id="statement_descriptor"
                    placeholder="How this will appear on customer statements"
                    maxLength={22}
                    {...step1Form.register('statement_descriptor')}
                  />
                  {step1Form.formState.errors.statement_descriptor && (
                    <p className="text-sm text-destructive mt-1">
                      {step1Form.formState.errors.statement_descriptor.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum 22 characters. This is how charges will appear on your customers' bank statements.
                  </p>
                </div>
                
                {/* Internal Use Fields */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Internal Use Only</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="data_source_system">Data Source System (Municipal IT System)</Label>
                      <Input
                        id="data_source_system"
                        placeholder="Enter data source system"
                        {...step1Form.register('data_source_system')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={(value) => {
                          step1Form.setValue('category', value);
                          step1Form.setValue('subcategory', ''); // Reset subcategory when category changes
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="subcategory">Subcategory</Label>
                        <Select 
                          onValueChange={(value) => step1Form.setValue('subcategory', value)}
                          disabled={!step1Form.watch('category')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                          <SelectContent>
                            {step1Form.watch('category') && MERCHANT_CATEGORIES[step1Form.watch('category') as keyof typeof MERCHANT_CATEGORIES]?.map((subcategory) => (
                              <SelectItem key={subcategory} value={subcategory}>
                                {subcategory}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating Seller...' : 'Next: Bank Account'}
              </Button>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Merchant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Merchant Name</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {step1Data?.merchant_name}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Merchant ID</Label>
                    <div className="p-2 bg-muted rounded text-sm font-mono">
                      {step1Data?.merchant_id}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Finix Identity ID</Label>
                  <div className="p-2 bg-muted rounded text-sm font-mono">
                    {step1Data?.finix_identity_id}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Bank Account Information</CardTitle>
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="font-medium">PCI Compliant & Secure</p>
                      <p className="text-blue-700 dark:text-blue-300 mt-1">
                        Your bank account details are securely collected by our payment processor (Finix). 
                        This information never touches our servers and is fully PCI compliant.
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!finixConfig ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                    <span className="text-sm text-muted-foreground">Loading secure payment configuration...</span>
                  </div>
                ) : (
                  <>
                    <div 
                      id="merchant-bank-form-container" 
                      className="min-h-[450px] mb-4"
                    />
                    {!isFinixFormReady && finixConfig && (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                        <span className="text-sm text-muted-foreground">Initializing secure bank account form...</span>
                      </div>
                    )}
                    {isFinixFormReady && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Secure form ready. All data is encrypted end-to-end.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setCurrentStep(1);
                  scrollToTop();
                }}
                disabled={isLoading}
              >
                Back to Step 1
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleStep2TokenizedSubmit} 
                  disabled={!isFinixFormReady || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Payment Instrument...
                    </>
                  ) : (
                    'Next: Review & Create Merchant'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Customer Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Legal Entity Name</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {customer.legal_entity_name}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Entity Type</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {customer.entity_type}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

             {/* Merchant Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Merchant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Merchant Name</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {step1Data?.merchant_name}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Merchant ID</Label>
                    <div className="p-2 bg-muted rounded text-sm font-mono">
                      {step1Data?.merchant_id}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Finix Identity ID</Label>
                  <div className="p-2 bg-muted rounded text-sm font-mono">
                    {step1Data?.finix_identity_id}
                  </div>
                </div>
                {(step1Data?.data_source_system || step1Data?.category || step1Data?.subcategory) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Internal Information</h4>
                    <div className="space-y-3">
                      {step1Data?.data_source_system && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Data Source System</Label>
                          <div className="p-2 bg-muted rounded text-sm">
                            {step1Data.data_source_system}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {step1Data?.category && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Category</Label>
                            <div className="p-2 bg-muted rounded text-sm">
                              {step1Data.category}
                            </div>
                          </div>
                        )}
                        {step1Data?.subcategory && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Subcategory</Label>
                            <div className="p-2 bg-muted rounded text-sm">
                              {step1Data.subcategory}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Bank Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Holder</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {step2Data?.bank_account_holder_name || customer.legal_entity_name}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Type</Label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {step2Data?.account_type || 'Not specified'}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Masked Account Number</Label>
                  <div className="p-2 bg-muted rounded text-sm font-mono">
                    ****{step2Data?.bank_last_four || '0000'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Bank Validation Status</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    <Badge variant={
                      step2Data?.bank_account_validation_check === 'VALID' ? 'default' :
                      step2Data?.bank_account_validation_check === 'INVALID' ? 'destructive' :
                      'secondary'
                    }>
                      {step2Data?.bank_account_validation_check || 'PENDING'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Finix Payment Instrument ID</Label>
                  <div className="p-2 bg-muted rounded text-sm font-mono break-all">
                    {step2Data?.finix_payment_instrument_id || 'Not created'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setCurrentStep(2);
                  scrollToTop();
                }}
                disabled={isLoading}
              >
                Back
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleStep3Submit} disabled={isLoading}>
                  {isLoading ? 'Creating Merchant Account...' : 'Create Merchant Account'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}