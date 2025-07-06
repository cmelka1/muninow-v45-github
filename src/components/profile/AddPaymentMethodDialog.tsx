import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GooglePlacesAutocomplete } from '@/components/ui/google-places-autocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Building2, MapPin } from 'lucide-react';

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Form schemas
const cardSchema = z.object({
  paymentType: z.literal('card'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
  cardNickname: z.string().optional(),
  cardNumber: z.string().min(13, 'Card number must be at least 13 digits').max(19, 'Card number must be at most 19 digits'),
  expirationMonth: z.string().min(1, 'Expiration month is required'),
  expirationYear: z.string().min(1, 'Expiration year is required'),
  securityCode: z.string().min(3, 'Security code must be at least 3 digits').max(4, 'Security code must be at most 4 digits'),
  useProfileAddress: z.boolean(),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  country: z.string().default('USA'),
});

const bankSchema = z.object({
  paymentType: z.literal('bank'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountNickname: z.string().optional(),
  routingNumber: z.string().length(9, 'Routing number must be 9 digits'),
  accountNumber: z.string().min(4, 'Account number is required'),
  accountType: z.enum(['personal_checking', 'personal_savings', 'business_checking', 'business_savings']),
  useProfileAddress: z.boolean(),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  country: z.string().default('USA'),
});

const formSchema = z.discriminatedUnion('paymentType', [cardSchema, bankSchema]);

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
  const [finixIdentityId, setFinixIdentityId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Load user's Finix identity ID
  useEffect(() => {
    const loadFinixIdentity = async () => {
      if (!profile?.id) return;

      try {
        const { data, error } = await supabase
          .from('finix_identities')
          .select('finix_identity_id')
          .eq('user_id', profile.id)
          .eq('account_type', profile.account_type)
          .single();

        if (error) {
          console.error('Error loading Finix identity:', error);
          toast({
            title: "Error",
            description: "Could not load payment setup information. Please try again.",
            variant: "destructive",
          });
          return;
        }

        setFinixIdentityId(data?.finix_identity_id || 'Not Available');
      } catch (error) {
        console.error('Error loading Finix identity:', error);
      }
    };

    if (open && profile) {
      loadFinixIdentity();
      
      // Reset form with profile data when dialog opens
      form.reset({
        paymentType: paymentType,
        cardholderName: `${profile.first_name} ${profile.last_name}`,
        accountHolderName: `${profile.first_name} ${profile.last_name}`,
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
    if (profile) {
      form.setValue('paymentType', paymentType);
      if (paymentType === 'card') {
        form.setValue('cardholderName', `${profile.first_name} ${profile.last_name}`);
      } else {
        form.setValue('accountHolderName', `${profile.first_name} ${profile.last_name}`);
      }
    }
  }, [paymentType, profile, form]);

  // Handle address selection from Google Places
  const handleAddressSelect = (addressComponents: any) => {
    form.setValue('streetAddress', addressComponents.streetAddress);
    form.setValue('city', addressComponents.city);
    form.setValue('state', addressComponents.state);
    form.setValue('zipCode', addressComponents.zipCode);
  };

  // Handle profile address checkbox change
  const handleUseProfileAddressChange = (checked: boolean) => {
    form.setValue('useProfileAddress', checked);
    
    if (checked && profile) {
      // Populate with profile address
      form.setValue('streetAddress', profile.street_address || '');
      form.setValue('city', profile.city || '');
      form.setValue('state', profile.state || '');
      form.setValue('zipCode', profile.zip_code || '');
    } else {
      // Clear address fields for manual entry
      form.setValue('streetAddress', '');
      form.setValue('city', '');
      form.setValue('state', '');
      form.setValue('zipCode', '');
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting payment method:', data.paymentType);
      
      let response;
      if (data.paymentType === 'card') {
        response = await supabase.functions.invoke('create-user-payment-card', {
          body: {
            cardholderName: data.cardholderName,
            cardNickname: data.cardNickname,
            cardNumber: data.cardNumber,
            expirationMonth: data.expirationMonth,
            expirationYear: data.expirationYear,
            securityCode: data.securityCode,
            streetAddress: data.streetAddress,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country
          }
        });
      } else {
        response = await supabase.functions.invoke('create-user-bank-account', {
          body: {
            accountHolderName: data.accountHolderName,
            accountNickname: data.accountNickname,
            routingNumber: data.routingNumber,
            accountNumber: data.accountNumber,
            accountType: data.accountType,
            streetAddress: data.streetAddress,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country
          }
        });
      }

      console.log('Edge function response:', response);

      // Check for Supabase function invocation errors (network/auth errors)
      if (response.error) {
        console.error('Supabase invocation error:', response.error);
        throw new Error(`Network error: ${response.error.message}`);
      }

      // Check for edge function business logic errors
      if (!response.data || response.data.success === false) {
        const errorMessage = response.data?.error || response.data?.details || 'Unknown error occurred';
        console.error('Edge function business error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Payment method created successfully:', response.data);
      
      // Success! Show toast and update UI
      toast({
        title: "Success",
        description: `${data.paymentType === 'card' ? 'Payment card' : 'Bank account'} added successfully.`,
      });
      
      // Refresh payment methods list and close dialog
      await onSuccess();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Payment method submission error:', error);
      
      let errorMessage = "Failed to add payment method. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  // Enhanced dialog close prevention for Google Places interactions
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Multiple checks to prevent premature dialog closure
      const googlePlacesContainer = document.querySelector('.pac-container');
      
      // Check if Google Places dropdown is visible
      const isGooglePlacesVisible = googlePlacesContainer && 
        window.getComputedStyle(googlePlacesContainer).display !== 'none' &&
        window.getComputedStyle(googlePlacesContainer).visibility !== 'hidden';
      
      // Check if we're currently processing a Google Places selection
      const hasActiveGooglePlacesInput = document.querySelector('.google-places-input:focus');
      
      // Check for recent Google Places activity (within last 100ms)
      const recentGooglePlacesActivity = document.querySelector('.pac-item:hover');
      
      if (isGooglePlacesVisible || hasActiveGooglePlacesInput || recentGooglePlacesActivity) {
        console.log('Preventing dialog closure due to Google Places activity');
        return;
      }
      
      // Add small delay to allow Google Places events to complete
      setTimeout(() => {
        handleClose();
      }, 50);
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
                <div className="text-right">
                  <Label className="text-xs font-medium text-muted-foreground">Finix Identity ID</Label>
                  <div className="mt-1 text-xs font-mono text-muted-foreground">
                    {finixIdentityId}
                  </div>
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

            {/* Payment Method Fields */}
            {paymentType === 'card' ? (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Card Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cardholderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cardholder Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                </div>

                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1234 5678 9012 3456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="expirationMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exp Month</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                {String(i + 1).padStart(2, '0')}
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
                    name="expirationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exp Year</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="YYYY" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => {
                              const year = new Date().getFullYear() + i;
                              return (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="securityCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CVV</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123" maxLength={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Account Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountHolderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="routingNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Routing Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123456789" maxLength={9} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Account number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          <GooglePlacesAutocomplete
                            value={field.value}
                            onChange={field.onChange}
                            onAddressSelect={handleAddressSelect}
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Payment Method'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};