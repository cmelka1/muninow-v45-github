import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
});

const step2Schema = z.object({
  bank_account_holder_name: z.string().min(1, 'Account holder name is required'),
  bank_routing_number: z.string().min(9, 'Routing number must be 9 digits').max(9, 'Routing number must be 9 digits'),
  bank_account_number: z.string().min(1, 'Account number is required'),
  bank_account_number_confirmation: z.string().min(1, 'Please confirm account number'),
  bank_account_type: z.enum(['business_checking', 'business_savings', 'personal_checking', 'personal_savings']),
}).refine((data) => data.bank_account_number === data.bank_account_number_confirmation, {
  message: "Account numbers don't match",
  path: ["bank_account_number_confirmation"],
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export function AddMerchantDialog({ open, onOpenChange, customer, onMerchantCreated }: AddMerchantDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const { toast } = useToast();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      merchant_name: customer.doing_business_as || '',
      statement_descriptor: '',
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      bank_account_holder_name: customer.legal_entity_name || '',
      bank_routing_number: '',
      bank_account_number: '',
      bank_account_number_confirmation: '',
      bank_account_type: 'business_checking',
    },
  });

  const handleStep1Submit = async (data: Step1Data) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-finix-customer', {
        body: {
          customer_id: customer.customer_id,
          merchant_name: data.merchant_name,
          statement_descriptor: data.statement_descriptor,
        },
      });

      if (error) throw error;

      setStep1Data(data);
      setCurrentStep(2);
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

  const handleStep2Submit = async (data: Step2Data) => {
    if (!step1Data) return;
    
    setIsLoading(true);
    try {
      // Step 2: Create payment instrument
      const { error: instrumentError } = await supabase.functions.invoke('create-finix-customer-payment-instrument', {
        body: {
          customer_id: customer.customer_id,
          ...data,
        },
      });

      if (instrumentError) throw instrumentError;

      // Step 3: Create merchant account
      const { error: merchantError } = await supabase.functions.invoke('create-customer-merchant', {
        body: {
          customer_id: customer.customer_id,
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
      step1Form.reset();
      step2Form.reset();
    } catch (error) {
      console.error('Error completing merchant setup:', error);
      toast({
        title: "Error",
        description: "Failed to complete merchant setup. Please try again.",
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
    step1Form.reset();
    step2Form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Merchant</DialogTitle>
          <div className="flex items-center space-x-2 mt-4">
            <Badge variant={currentStep >= 1 ? "default" : "secondary"}>
              Step 1: Business Information
            </Badge>
            <Badge variant={currentStep >= 2 ? "default" : "secondary"}>
              Step 2: Bank Account
            </Badge>
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
          <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Bank Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bank_account_holder_name">Account Holder Name *</Label>
                  <Input
                    id="bank_account_holder_name"
                    {...step2Form.register('bank_account_holder_name')}
                  />
                  {step2Form.formState.errors.bank_account_holder_name && (
                    <p className="text-sm text-destructive mt-1">
                      {step2Form.formState.errors.bank_account_holder_name.message}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_routing_number">Routing Number *</Label>
                    <Input
                      id="bank_routing_number"
                      placeholder="123456789"
                      maxLength={9}
                      {...step2Form.register('bank_routing_number')}
                    />
                    {step2Form.formState.errors.bank_routing_number && (
                      <p className="text-sm text-destructive mt-1">
                        {step2Form.formState.errors.bank_routing_number.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="bank_account_type">Account Type *</Label>
                    <Select onValueChange={(value) => step2Form.setValue('bank_account_type', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business_checking">Business Checking</SelectItem>
                        <SelectItem value="business_savings">Business Savings</SelectItem>
                        <SelectItem value="personal_checking">Personal Checking</SelectItem>
                        <SelectItem value="personal_savings">Personal Savings</SelectItem>
                      </SelectContent>
                    </Select>
                    {step2Form.formState.errors.bank_account_type && (
                      <p className="text-sm text-destructive mt-1">
                        {step2Form.formState.errors.bank_account_type.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="bank_account_number">Account Number *</Label>
                  <Input
                    id="bank_account_number"
                    type="password"
                    {...step2Form.register('bank_account_number')}
                  />
                  {step2Form.formState.errors.bank_account_number && (
                    <p className="text-sm text-destructive mt-1">
                      {step2Form.formState.errors.bank_account_number.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bank_account_number_confirmation">Confirm Account Number *</Label>
                  <Input
                    id="bank_account_number_confirmation"
                    type="password"
                    {...step2Form.register('bank_account_number_confirmation')}
                  />
                  {step2Form.formState.errors.bank_account_number_confirmation && (
                    <p className="text-sm text-destructive mt-1">
                      {step2Form.formState.errors.bank_account_number_confirmation.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
                disabled={isLoading}
              >
                Back
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating Merchant...' : 'Create Merchant'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}