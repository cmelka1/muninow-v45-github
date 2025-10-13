import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GooglePlacesAutocompleteV2 } from '@/components/ui/google-places-autocomplete-v2';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Save, X, User, Mail, Phone, MapPin, Building, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatPhoneForDisplay, normalizePhoneInput } from '@/lib/phoneUtils';
import * as z from 'zod';

interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

// Address 2 Types (same as signup form)
const ADDRESS_2_TYPES = [
  'Apartment',
  'Suite',
  'Floor',
  'Building',
  'Room',
  'Unit',
  'Department',
  'Lot',
  'Basement',
  'Penthouse'
];

// Industries for business accounts
const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Construction',
  'Real Estate',
  'Transportation',
  'Food & Beverage',
  'Professional Services',
  'Non-Profit',
  'Government',
  'Other'
];

// Form validation schema
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  streetAddress: z.string().optional(),
  address2Type: z.string().optional(),
  address2Value: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  businessName: z.string().optional(),
  industry: z.string().optional()
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const PersonalTab = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Parse address2 from existing apt_number
  const parseAptNumber = (aptNumber: string | null) => {
    if (!aptNumber) return { type: '', value: '' };
    
    const parts = aptNumber.split(' ');
    if (parts.length >= 2) {
      return {
        type: parts[0],
        value: parts.slice(1).join(' ')
      };
    }
    return { type: '', value: aptNumber };
  };

  const existingApt = parseAptNumber((profile as any)?.apt_number || null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      phone: profile?.phone || '',
      streetAddress: profile?.street_address || '',
      address2Type: existingApt.type || '',
      address2Value: existingApt.value || '',
      city: profile?.city || '',
      state: profile?.state || '',
      zipCode: profile?.zip_code || '',
      businessName: profile?.business_legal_name || '',
      industry: profile?.industry || ''
    }
  });

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      const existingApt = parseAptNumber((profile as any).apt_number);
      form.reset({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        streetAddress: profile.street_address || '',
        address2Type: existingApt.type || '',
        address2Value: existingApt.value || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zip_code || '',
        businessName: profile.business_legal_name || '',
        industry: profile.industry || ''
      });
    }
  }, [profile, form]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Handle address selection from Google Places Autocomplete
  const handleAddressSelect = (addressComponents: AddressComponents) => {
    console.log('Address selected:', addressComponents);
    
    // Distribute to proper form fields using setValue
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
    
    // Trigger validation for updated fields
    form.trigger(['streetAddress', 'city', 'state', 'zipCode']);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          street_address: data.streetAddress,
          apt_number: data.address2Type && data.address2Value 
            ? `${data.address2Type} ${data.address2Value.toUpperCase()}`
            : null,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          business_legal_name: data.businessName,
          industry: data.industry || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile information has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const watchedValues = form.watch();

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Personal Information */}
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
                {!isEditing ? (
                  <Button type="button" onClick={() => setIsEditing(true)} variant="outline">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button type="submit" size="sm" disabled={isLoading}>
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button type="button" onClick={handleCancel} variant="outline" size="sm" disabled={isLoading}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">First Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Email Address</Label>
                  <Input
                    type="email"
                    value={user?.email || ''}
                    disabled={true}
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-slate-500">
                    Email cannot be changed here. Contact support if needed.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          disabled={!isEditing} 
                          type="tel"
                          value={field.value ? formatPhoneForDisplay(field.value) : ''}
                          onChange={(e) => {
                            const formatted = normalizePhoneInput(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>


          {/* Business Information (if applicable) */}
          {(profile?.account_type === 'businessadmin' || profile?.account_type === 'businessuser') && (
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Business Legal Name</FormLabel>
                       <FormControl>
                         <Input {...field} disabled={!isEditing} />
                       </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Industry</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                        disabled={!isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

        </form>
      </Form>
    </div>
  );
};