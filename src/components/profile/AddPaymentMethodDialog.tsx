import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GooglePlacesAutocompleteV2 } from '@/components/ui/google-places-autocomplete-v2';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Building2, MapPin } from 'lucide-react';

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (paymentMethodId?: string) => void;
}

// Form schemas for metadata only (Finix handles sensitive data)
const cardMetadataSchema = z.object({
  paymentType: z.literal('card'),
  cardNickname: z.string().optional(),
  useProfileAddress: z.boolean(),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  country: z.string().default('USA'),
});

const bankMetadataSchema = z.object({
  paymentType: z.literal('bank'),
  accountNickname: z.string().optional(),
  accountType: z.enum(['personal_checking', 'personal_savings', 'business_checking', 'business_savings']),
  useProfileAddress: z.boolean(),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  country: z.string().default('USA'),
});

const formSchema = z.discriminatedUnion('paymentType', [cardMetadataSchema, bankMetadataSchema]);

type FormData = z.infer<typeof formSchema>;

// US States for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const AddPaymentMethodDialog: React.FC<AddPaymentMethodDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [paymentType, setPaymentType] = useState<'card' | 'bank'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finixConfig, setFinixConfig] = useState<{ applicationId: string; environment: 'sandbox' | 'live' } | null>(null);
  const [finixForm, setFinixForm] = useState<{
    form: any;
    observer: MutationObserver | null;
    fallbackTimer: NodeJS.Timeout | null;
  } | null>(null);
  const [finixFormReady, setFinixFormReady] = useState(false);
  const [finixLibraryLoaded, setFinixLibraryLoaded] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentType: 'card',
      useProfileAddress: true,
      country: 'USA',
      streetAddress: profile?.street_address || '',
      city: profile?.city || '',
      state: profile?.state || '',
      zipCode: profile?.zip_code || '',
    }
  });

  const useProfileAddress = form.watch('useProfileAddress');

  // Wait for Finix library to load with retry mechanism
  useEffect(() => {
    if (!open) return;

    let retryCount = 0;
    const maxRetries = 20;
    const retryInterval = 500;

    const checkFinixLibrary = () => {
      if (typeof window !== 'undefined' && window.Finix) {
        console.log('✅ Finix library loaded successfully');
        setFinixLibraryLoaded(true);
        setInitializationError(null);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkFinixLibrary()) {
      return;
    }

    // Retry with polling
    const intervalId = setInterval(() => {
      retryCount++;
      console.log(`Checking for Finix library... (attempt ${retryCount}/${maxRetries})`);
      
      if (checkFinixLibrary()) {
        clearInterval(intervalId);
      } else if (retryCount >= maxRetries) {
        clearInterval(intervalId);
        const errorMsg = 'Finix payment library failed to load. Please refresh the page and try again.';
        console.error('❌', errorMsg);
        setInitializationError(errorMsg);
        toast({
          title: "Library Loading Error",
          description: errorMsg,
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          ),
        });
      }
    }, retryInterval);

    return () => clearInterval(intervalId);
  }, [open, toast]);

  // Fetch Finix configuration
  useEffect(() => {
    const fetchFinixConfig = async () => {
      try {
        console.log('Fetching Finix configuration...');
        const { data, error } = await supabase.functions.invoke('get-finix-config');

        if (error) {
          console.error('Error fetching Finix config:', error);
          throw error;
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to get Finix configuration');
        }

        console.log('✅ Finix configuration loaded:', data.applicationId);
        setFinixConfig({
          applicationId: data.applicationId,
          environment: data.environment,
        });
      } catch (error) {
        console.error('❌ Error loading Finix config:', error);
        const errorMsg = "Failed to load payment form configuration. Please try again.";
        setInitializationError(errorMsg);
        toast({
          title: "Configuration Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    };

    if (open && finixLibraryLoaded) {
      fetchFinixConfig();
    }
  }, [open, finixLibraryLoaded, toast]);

  // Initialize Finix form when config is loaded and payment type changes
  useEffect(() => {
    if (!finixConfig || !finixLibraryLoaded || !window.Finix || !open) {
      console.log('⏳ Waiting for prerequisites:', {
        finixConfig: !!finixConfig,
        finixLibraryLoaded,
        windowFinix: !!window.Finix,
        open
      });
      return;
    }

    // Clean up existing form
    if (finixForm) {
      try {
        console.log('🧹 Cleaning up previous form');
        finixForm.form.destroy();
      } catch (e) {
        console.log('Error destroying previous form:', e);
      }
      setFinixForm(null);
      setFinixFormReady(false);
    }

    try {
      console.log(`🔧 Initializing Finix ${paymentType} form...`);
      setInitializationError(null);
      
      // Define styles first
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
        },
        error: {
          borderColor: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive))',
        },
      };
      
      const containerId = `finix-${paymentType}-form-container`;
      
      // Create appropriate form type with only styles config
      const form = paymentType === 'card'
        ? window.Finix.CardTokenForm(containerId, {
            styles: formStyles
          })
        : window.Finix.BankTokenForm(containerId, {
            styles: formStyles
          });

      console.log('✅ Finix form instance created');
      
      // Defensive check
      if (!form) {
        throw new Error('Failed to create Finix form instance');
      }

      // Set up event listeners
      if (typeof form.on === 'function') {
        form.on('ready', () => {
          console.log('✅ Finix form ready event fired');
          setFinixFormReady(true);
        });

        form.on('change', (data: any) => {
          console.log('📝 Finix form changed:', data);
        });

        form.on('error', (error: any) => {
          console.error('❌ Finix form error:', error);
          toast({
            title: "Form Error",
            description: error.message || "An error occurred with the payment form",
            variant: "destructive",
          });
        });
      }

      // Fallback 1: Check for iframe elements (Finix injects iframes for secure fields)
      const checkForFormElements = () => {
        const container = document.getElementById(containerId);
        if (container) {
          const iframes = container.querySelectorAll('iframe');
          if (iframes.length > 0) {
            console.log('✅ Finix form iframes detected, marking as ready');
            setFinixFormReady(true);
            return true;
          }
        }
        return false;
      };

      // Fallback 2: Set up a mutation observer to detect when Finix injects content
      let observer: MutationObserver | null = null;
      const container = document.getElementById(containerId);
      if (container) {
        observer = new MutationObserver(() => {
          if (checkForFormElements() && observer) {
            observer.disconnect();
          }
        });
        
        observer.observe(container, {
          childList: true,
          subtree: true
        });
      }

      // Fallback 3: Timeout - if form hasn't reported ready after 3 seconds but has content, mark as ready
      const fallbackTimer = setTimeout(() => {
        // Check if form is already marked as ready by looking at the DOM
        const container = document.getElementById(containerId);
        if (container) {
          const iframes = container.querySelectorAll('iframe');
          // Only log warning and set state if iframes exist but ready wasn't called
          if (iframes.length > 0) {
            console.log('⚠️ Finix ready event did not fire, but form content detected - marking as ready via timeout');
            setFinixFormReady(true);
          }
        }
      }, 3000);

      setFinixForm({ form, observer, fallbackTimer });
    } catch (error) {
      console.error('❌ Error initializing Finix form:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize payment form';
      setInitializationError(errorMsg);
      toast({
        title: "Form Initialization Error",
        description: `${errorMsg}. Please refresh and try again.`,
        variant: "destructive",
      });
    }

    // Cleanup on unmount
    return () => {
      if (finixForm) {
        try {
          console.log('🧹 Cleanup: destroying form and observers');
          if (finixForm.observer) {
            finixForm.observer.disconnect();
          }
          if (finixForm.fallbackTimer) {
            clearTimeout(finixForm.fallbackTimer);
          }
          finixForm.form.destroy();
        } catch (e) {
          console.log('Error destroying form on cleanup:', e);
        }
      }
    };
  }, [finixConfig, finixLibraryLoaded, paymentType, open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && profile) {
      form.reset({
        paymentType: paymentType,
        useProfileAddress: true,
        country: 'USA',
        streetAddress: profile.street_address || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zip_code || '',
      });
    }
  }, [open, profile, paymentType, form]);

  // Update form when payment type changes
  useEffect(() => {
    form.setValue('paymentType', paymentType);
  }, [paymentType, form]);

  // Handle address selection from Google Places
  const handleAddressSelect = (addressComponents: any) => {
    if (addressComponents.streetAddress) {
      form.setValue('streetAddress', addressComponents.streetAddress);
    }
    if (addressComponents.city) {
      form.setValue('city', addressComponents.city);
    }
    if (addressComponents.state) {
      form.setValue('state', addressComponents.state);
    }
    if (addressComponents.zipCode) {
      form.setValue('zipCode', addressComponents.zipCode);
    }
    
    form.trigger(['streetAddress', 'city', 'state', 'zipCode']);
  };

  // Handle profile address checkbox change
  const handleUseProfileAddressChange = (checked: boolean) => {
    form.setValue('useProfileAddress', checked);
    
    if (checked && profile) {
      form.setValue('streetAddress', profile.street_address || '');
      form.setValue('city', profile.city || '');
      form.setValue('state', profile.state || '');
      form.setValue('zipCode', profile.zip_code || '');
    } else {
      form.setValue('streetAddress', '');
      form.setValue('city', '');
      form.setValue('state', '');
      form.setValue('zipCode', '');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!finixForm || !finixFormReady) {
      toast({
        title: "Form Not Ready",
        description: "Please wait for the payment form to load.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Submitting Finix form...');
      
      // Submit Finix form to get token (callback-based per Finix docs)
      finixForm.form.submit(finixConfig.environment, finixConfig.applicationId, async (err: any, res: any) => {
        if (err) {
          console.error('Finix submission error:', err);
          toast({
            title: "Payment Form Error",
            description: err.message || "Failed to process payment information",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const tokenData = res.data || {};
        const token = tokenData.id;
        console.log('Finix token received:', token);

        // Prepare address override if not using profile address
        const addressOverride = !data.useProfileAddress ? {
          streetAddress: data.streetAddress,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
        } : undefined;

        // Call appropriate tokenized edge function
        let response;
        if (data.paymentType === 'card') {
          response = await supabase.functions.invoke('create-user-payment-card-tokenized', {
            body: {
              finixToken: token,
              nickname: data.cardNickname,
              addressOverride,
            }
          });
        } else {
          response = await supabase.functions.invoke('create-user-bank-account-tokenized', {
            body: {
              finixToken: token,
              nickname: data.accountNickname,
              accountType: data.accountType,
              addressOverride,
            }
          });
        }

        // Check for errors
        if (response.error) {
          console.error('Supabase invocation error:', response.error);
          toast({
            title: "Error",
            description: `Network error: ${response.error.message}`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        if (!response.data || response.data.success === false) {
          const errorMessage = response.data?.error || 'Unknown error occurred';
          console.error('Edge function error:', errorMessage);
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        console.log('Payment method created successfully:', response.data);
        
        toast({
          title: "Success",
          description: `${data.paymentType === 'card' ? 'Payment card' : 'Bank account'} added successfully.`,
        });
        
        const paymentMethodId = response.data?.paymentInstrument?.id;
        await onSuccess(paymentMethodId);
        onOpenChange(false);
        setIsSubmitting(false);
      });
      
    } catch (error) {
      console.error('Payment method submission error:', error);
      setIsSubmitting(false);
      
      let errorMessage = "Failed to add payment method. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    if (finixForm) {
      try {
        finixForm.form.clear();
      } catch (e) {
        console.log('Error clearing form:', e);
      }
    }
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Payment Method</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* User Information - Read Only */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">User Name</Label>
                  <div className="mt-1 text-lg font-medium">{profile.first_name} {profile.last_name}</div>
                </div>
              </div>
            </div>

            {/* Payment Type Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Type</Label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setPaymentType('card')}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    paymentType === 'card'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('bank')}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    paymentType === 'bank'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Bank Account</span>
                </button>
              </div>
            </div>

            {/* Finix Tokenized Form */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                {paymentType === 'card' ? (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Card Information
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    Bank Account Information
                  </>
                )}
              </h3>

              {/* Nickname Field */}
              {paymentType === 'card' ? (
                <FormField
                  control={form.control}
                  name="cardNickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Nickname <span className="text-muted-foreground">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Personal Visa" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="accountNickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Nickname <span className="text-muted-foreground">(Optional)</span></FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Primary Checking" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personal_checking">Personal Checking</SelectItem>
                            <SelectItem value="personal_savings">Personal Savings</SelectItem>
                            <SelectItem value="business_checking">Business Checking</SelectItem>
                            <SelectItem value="business_savings">Business Savings</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Finix Tokenized Form Container */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {paymentType === 'card' ? 'Card Details' : 'Account Details'}
                </Label>
                <div 
                  id={`finix-${paymentType}-form-container`}
                  className="min-h-[120px] p-4 border rounded-lg bg-background"
                >
                  {initializationError ? (
                    <div className="flex flex-col items-center justify-center h-[120px] space-y-2">
                      <div className="text-sm text-destructive text-center">{initializationError}</div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.reload()}
                      >
                        Refresh Page
                      </Button>
                    </div>
                  ) : !finixLibraryLoaded ? (
                    <div className="flex items-center justify-center h-[120px]">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        <div className="text-sm text-muted-foreground">Loading payment library...</div>
                      </div>
                    </div>
                  ) : !finixConfig ? (
                    <div className="flex items-center justify-center h-[120px]">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        <div className="text-sm text-muted-foreground">Loading configuration...</div>
                      </div>
                    </div>
                  ) : !finixFormReady && (
                    <div className="flex items-center justify-center h-[120px]">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        <div className="text-sm text-muted-foreground">Initializing secure form...</div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  🔒 Your payment information is securely handled by Finix and never touches our servers.
                </p>
              </div>
            </div>

            {/* Billing Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <h3 className="font-medium">Billing Address</h3>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useProfileAddress"
                  checked={useProfileAddress}
                  onCheckedChange={handleUseProfileAddressChange}
                />
                <Label htmlFor="useProfileAddress" className="text-sm">
                  Use my profile address
                </Label>
              </div>

              {useProfileAddress ? (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">{profile.street_address}</div>
                    <div>{profile.city}, {profile.state} {profile.zip_code}</div>
                    <div>USA</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="streetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <GooglePlacesAutocompleteV2
                            onAddressSelect={handleAddressSelect}
                            className="h-11"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Enter your street address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="State" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                    <div className="mt-1 text-sm font-medium">USA</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !finixFormReady}>
                {isSubmitting ? 'Adding...' : 'Add Payment Method'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
