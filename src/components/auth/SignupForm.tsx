import React, { useState } from 'react';

import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { GooglePlacesAutocompleteV2 } from '@/components/ui/google-places-autocomplete-v2';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { mapAccountTypeForFinix } from '@/utils/accountTypeMapping';
import { MFAVerificationStep } from '@/components/auth/MFAVerificationStep';

// Phone number formatting utility
const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

// Password strength calculation
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[a-z]/.test(password)) strength += 20;
  if (/\d/.test(password)) strength += 20;
  if (/[!@#$%^&*]/.test(password)) strength += 20;
  return strength;
};

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

// US States
const US_STATES = [
  { value: 'AL', label: 'AL' },
  { value: 'AK', label: 'AK' },
  { value: 'AZ', label: 'AZ' },
  { value: 'AR', label: 'AR' },
  { value: 'CA', label: 'CA' },
  { value: 'CO', label: 'CO' },
  { value: 'CT', label: 'CT' },
  { value: 'DE', label: 'DE' },
  { value: 'FL', label: 'FL' },
  { value: 'GA', label: 'GA' },
  { value: 'HI', label: 'HI' },
  { value: 'ID', label: 'ID' },
  { value: 'IL', label: 'IL' },
  { value: 'IN', label: 'IN' },
  { value: 'IA', label: 'IA' },
  { value: 'KS', label: 'KS' },
  { value: 'KY', label: 'KY' },
  { value: 'LA', label: 'LA' },
  { value: 'ME', label: 'ME' },
  { value: 'MD', label: 'MD' },
  { value: 'MA', label: 'MA' },
  { value: 'MI', label: 'MI' },
  { value: 'MN', label: 'MN' },
  { value: 'MS', label: 'MS' },
  { value: 'MO', label: 'MO' },
  { value: 'MT', label: 'MT' },
  { value: 'NE', label: 'NE' },
  { value: 'NV', label: 'NV' },
  { value: 'NH', label: 'NH' },
  { value: 'NJ', label: 'NJ' },
  { value: 'NM', label: 'NM' },
  { value: 'NY', label: 'NY' },
  { value: 'NC', label: 'NC' },
  { value: 'ND', label: 'ND' },
  { value: 'OH', label: 'OH' },
  { value: 'OK', label: 'OK' },
  { value: 'OR', label: 'OR' },
  { value: 'PA', label: 'PA' },
  { value: 'RI', label: 'RI' },
  { value: 'SC', label: 'SC' },
  { value: 'SD', label: 'SD' },
  { value: 'TN', label: 'TN' },
  { value: 'TX', label: 'TX' },
  { value: 'UT', label: 'UT' },
  { value: 'VT', label: 'VT' },
  { value: 'VA', label: 'VA' },
  { value: 'WA', label: 'WA' },
  { value: 'WV', label: 'WV' },
  { value: 'WI', label: 'WI' },
  { value: 'WY', label: 'WY' }
];

// Address 2 Types
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

// Form validation schema
const signupSchema = z.object({
  accountType: z.enum(['resident', 'business']),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  mobileNumber: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Please enter a valid phone number'),
  businessLegalName: z.string().optional(),
  industry: z.string().optional(),
  streetAddress: z.string().min(5, 'Street address must be at least 5 characters'),
  address2Type: z.string().optional(),
  address2Value: z.string().optional(),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(1, 'Please select a state'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(val => val, 'You must accept the terms and conditions'),
  marketingConsent: z.boolean().refine(val => val, 'Marketing consent is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.accountType === 'business') {
    return data.businessLegalName && data.businessLegalName.length >= 2;
  }
  return true;
}, {
  message: "Business legal name is required for business accounts",
  path: ["businessLegalName"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onBack: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [addressStatus, setAddressStatus] = useState<'checking' | 'available' | 'duplicate' | null>(null);
  const [formData, setFormData] = useState<SignupFormValues | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [isValidatingInvitation, setIsValidatingInvitation] = useState(false);
  const { signUp } = useAuth();

  // Scroll to top utility function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      accountType: 'resident',
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: '',
      businessLegalName: '',
      industry: '',
      streetAddress: '',
      address2Type: '',
      address2Value: '',
      city: '',
      state: '',
      zipCode: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
      marketingConsent: false
    }
  });

  // Check for invitation token on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invitationToken = urlParams.get('invitation');
    
    if (invitationToken) {
      validateInvitation(invitationToken);
    }
  }, []);

  const watchPassword = form.watch('password');
  const watchAccountType = form.watch('accountType');

  // Update password strength when password changes
  React.useEffect(() => {
    if (watchPassword) {
      setPasswordStrength(calculatePasswordStrength(watchPassword));
    } else {
      setPasswordStrength(0);
    }
  }, [watchPassword]);

  // Validate invitation token
  const validateInvitation = async (token: string) => {
    setIsValidatingInvitation(true);
    try {
      const { data: invitation, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !invitation) {
        toast({
          title: "Invalid Invitation",
          description: "This invitation link is invalid or has expired. Please contact the person who invited you.",
          variant: "destructive",
        });
        return;
      }

      setInvitationData(invitation);
      
      // Pre-populate form with invitation data
      form.setValue('email', invitation.invitation_email);
      form.setValue('accountType', invitation.organization_type as 'resident' | 'business');
      
      toast({
        title: "Welcome!",
        description: `You've been invited to join as a ${invitation.role === 'admin' ? 'administrator' : 'member'}.`,
      });
    } catch (error) {
      console.error('Error validating invitation:', error);
      toast({
        title: "Error",
        description: "Failed to validate invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingInvitation(false);
    }
  };

  // Check email for duplicates
  const checkEmailDuplicate = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setIsCheckingEmail(true);
    try {
      const { data, error } = await supabase.rpc('check_email_duplicate', {
        email_input: email
      });

      if (error) {
        return;
      }

      if (data) {
        form.setError('email', {
          type: 'manual',
          message: 'An account with this email already exists'
        });
      }
    } catch (error) {
      // Silent fail for better UX
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Handle address selection from Google Places Autocomplete
  const handleAddressSelect = (addressComponents: any) => {
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

  // Step 1: Handle form submission (validate and store data)
  const onSubmit = async (data: SignupFormValues) => {
    if (currentStep === 1) {
      // Validate email and store form data for next steps
      setIsCheckingEmail(true);
      try {
        const { data: emailExists, error: emailError } = await supabase.rpc('check_email_duplicate', {
          email_input: data.email
        });

        if (emailError) {
          toast({
            title: "Error",
            description: "Failed to validate email. Please try again.",
            variant: "destructive"
          });
          return;
        }

        if (emailExists) {
          form.setError('email', {
            type: 'manual',
            message: 'An account with this email already exists'
          });
          return;
        }

        // Store form data and move to address verification
        setFormData(data);
        setCurrentStep(2);
        scrollToTop();
        verifyAddress(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to validate email. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsCheckingEmail(false);
      }
    }
  };

  // Step 2: Verify address
  const verifyAddress = async (data: SignupFormValues) => {
    setIsCheckingAddress(true);
    setAddressStatus('checking');
    
    try {
      const { data: addressExists, error } = await supabase.rpc('check_address_duplicate', {
        street_input: data.streetAddress,
        city_input: data.city,
        state_input: data.state,
        zip_input: data.zipCode,
        apt_input: data.address2Type && data.address2Value 
          ? `${data.address2Type} ${data.address2Value.toUpperCase()}`
          : undefined
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to verify address. Please try again.",
          variant: "destructive"
        });
        setAddressStatus(null);
        return;
      }

      setAddressStatus(addressExists ? 'duplicate' : 'available');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify address. Please try again.",
        variant: "destructive"
      });
      setAddressStatus(null);
    } finally {
      setIsCheckingAddress(false);
    }
  };

  // Step 3: Confirm address and move to MFA
  const confirmAddress = () => {
    if (addressStatus === 'available') {
      setCurrentStep(3);
      scrollToTop();
    }
  };

  // Step 4: Complete MFA and create account with Finix integration
  const completeMFA = async () => {
    if (!formData) return;
    
    setIsCreatingAccount(true);
    let authData: any = null;
    
    try {
      // Check if we are already logged in (due to MFA step)
      const { data: { session } } = await supabase.auth.getSession();
      
      const metadata = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.mobileNumber,
        street_address: formData.streetAddress,
        apt_number: formData.address2Type && formData.address2Value 
          ? `${formData.address2Type} ${formData.address2Value.toUpperCase()}`
          : null,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
         account_type: invitationData ? formData.accountType : 
           (formData.accountType === 'business' ? 'businessadmin' : 'residentadmin'),
         business_legal_name: formData.accountType === 'business' ? formData.businessLegalName : null,
         industry: formData.accountType === 'business' && formData.industry ? formData.industry : null
      };

      if (session?.user) {
        console.log('User already verified via MFA. Upgrading account...');
        // User exists (Phone/Email Auth). We need to "Upgrade" them with password and metadata.
        const { data, error: updateError } = await supabase.auth.updateUser({
          email: formData.email, // Ensure email is set (if they used Phone Auth)
          password: formData.password,
          data: metadata
        });

        if (updateError) {
           // If email is already taken by ANOTHER user, this will fail.
           throw new Error(`Account update failed: ${updateError.message}`);
        }
        authData = data;
      } else {
        console.log('No session found. Creating new account...');
        // Fallback: User not logged in? (Maybe they skipped MFA or it failed to persist?)
        // Try standard signup
        const { data, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: metadata,
          }
        });
        
        if (authError) {
          throw new Error(`Account creation failed: ${authError.message}`);
        }
        authData = data;
      }
      
      // Phase 2: Wait for profile creation (database trigger should handle this)
      let profileVerified = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!profileVerified && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name')
            .eq('id', authData.user.id)
            .single();
            
          if (profile && !profileError) {
            profileVerified = true;
          }
        } catch (error) {
          // Continue attempting
        }
        
        attempts++;
      }
      
      if (!profileVerified) {
        // Continue anyway - profile creation might be delayed but shouldn't block signup
      }
      
      // Phase 3: Create Finix identity for payment processing
      try {
        const identityData = {
          entity: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.mobileNumber,
            personal_address: {
              line1: formData.streetAddress,
              line2: formData.address2Type && formData.address2Value 
                ? `${formData.address2Type} ${formData.address2Value.toUpperCase()}`
                : null,
              city: formData.city,
              region: formData.state,
              postal_code: formData.zipCode,
              country: 'USA'
            }
          },
          accountType: formData.accountType,
          businessId: formData.accountType === 'business' ? authData.user.id : undefined
        };
        
        const { data: identityResult, error: identityError } = await supabase.functions
          .invoke('finix-create-identity', {
            body: identityData
          });
        
        if (identityError) {
          // Don't fail the entire signup - payment can be set up later
          toast({
            title: "Account created with payment setup pending",
            description: "Your account was created successfully. Payment processing will be available shortly.",
            variant: "default"
          });
        } else {
          // Phase 4: Store Finix identity data in database
          if (identityResult?.identity) {
            try {
              const { error: finixDbError } = await supabase
                .from('finix_identities')
                .insert({
                  user_id: authData.user.id,
                  finix_identity_id: identityResult.identity.id,
                  finix_application_id: identityResult.identity.application,
                  account_type: mapAccountTypeForFinix(formData.accountType),
                  identity_type: identityResult.identity.type || 'INDIVIDUAL',
                  verification_status: identityResult.identity.verification?.status || 'pending',
                  entity_data: identityResult.identity.entity || {},
                  first_name: formData.firstName,
                  last_name: formData.lastName,
                  email: formData.email,
                  phone: formData.mobileNumber,
                  business_id: formData.accountType === 'business' ? authData.user.id : null
                });
                
              if (finixDbError) {
                // Handle error silently
              }
            } catch (dbError) {
              // Handle error silently
            }
          }
        }
      } catch (finixError) {
        // Continue with account creation - payment can be set up later
      }
      
      // Phase 5: Handle invitation acceptance if applicable
      if (invitationData) {
        try {
          const { error: acceptError } = await supabase.rpc('accept_organization_invitation', {
            p_invitation_token: invitationData.invitation_token
          });
          
          if (acceptError) {
            console.error('Error accepting invitation:', acceptError);
            toast({
              title: "Account created but invitation failed",
              description: "Your account was created successfully, but we couldn't accept the invitation. Please contact your admin.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Welcome to the organization!",
              description: `Your account was created and you've been added as a ${invitationData.role === 'admin' ? 'administrator' : 'member'}.`
            });
          }
        } catch (inviteError) {
          console.error('Error processing invitation:', inviteError);
          // Continue anyway
        }
      } else {
        // Phase 5b: Assign appropriate admin role for non-invitation signups
        try {
          const roleName = formData.accountType === 'business' ? 'businessadmin' : 'residentadmin';
          const { error: roleError } = await supabase.rpc('assign_role_to_user', {
            _user_id: authData.user.id,
            _role_name: roleName
          });
          
          if (roleError) {
            // Don't block account creation - user can be assigned role later
          }
        } catch (roleError) {
          // Continue with account creation - role can be assigned later
        }
        
        // Success - show completion message for normal signup
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account and complete the setup."
        });
      }
      
      setCurrentStep(4);
      scrollToTop();
      
    } catch (error: any) { // Catch block handles renaming
      // Enhanced error handling
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.message.includes('already registered')) {
        errorMessage = "An account with this email/phone already exists. Please sign in instead.";
      } else if (error.message.includes('Password')) {
        errorMessage = "Password doesn't meet requirements. Please check your password.";
      } else if (error.message.includes('Email')) {
        errorMessage = "Please provide a valid email address.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Account Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 2) {
        setAddressStatus(null);
      }
      scrollToTop();
    } else {
      onBack();
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-destructive';
    if (passwordStrength < 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 80) return 'Medium';
    return 'Strong';
  };

  return (
    <Card className="signin-card card-entrance border-0 bg-card/95 w-full max-w-2xl">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-3xl font-bold gradient-text mb-2">
          Create Your Account
        </CardTitle>
        <CardDescription className="text-muted-foreground text-base">
          Join our platform and get started today
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-8 pb-8">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep} of 4</span>
            <span>
              {currentStep === 1 && "Information"}
              {currentStep === 2 && "Address Verification"}
              {currentStep === 3 && "Security Setup"}
              {currentStep === 4 && "Complete"}
            </span>
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-2" />
        </div>

        {/* Loading state for invitation validation */}
        {isValidatingInvitation && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Validating invitation...</p>
          </div>
        )}

        {/* Invitation banner */}
        {invitationData && !isValidatingInvitation && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-primary font-semibold">🎉 You're invited!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You've been invited to join as a <strong>{invitationData.role === 'admin' ? 'administrator' : 'member'}</strong> 
              {' '}in a <strong>{invitationData.organization_type}</strong> organization.
            </p>
          </div>
        )}

        {/* Step 1: Form Collection */}
        {currentStep === 1 && !isValidatingInvitation && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Account Type Selection */}
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-foreground mb-3">
                    Account Type
                  </FormLabel>
                  <FormControl>
                    <Tabs
                      defaultValue="resident"
                      value={field.value}
                      onValueChange={invitationData ? () => {} : field.onChange}
                    >
                      <TabsList className={`grid w-full grid-cols-2 ${invitationData ? 'opacity-50 pointer-events-none' : ''}`}>
                        <TabsTrigger value="resident">Resident</TabsTrigger>
                        <TabsTrigger value="business">Business</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  {invitationData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Account type set by invitation
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your first name"
                          className="h-11"
                        />
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
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your last name"
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <div className="relative">
                         <Input
                           {...field}
                           type="email"
                           placeholder="Enter your email address"
                           className="h-11 pr-10"
                           disabled={!!invitationData}
                           onBlur={(e) => {
                             field.onBlur();
                             if (!invitationData) {
                               checkEmailDuplicate(e.target.value);
                             }
                           }}
                         />
                        {isCheckingEmail && (
                          <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(555) 123-4567"
                        className="h-11"
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Business Information Section */}
            {watchAccountType === 'business' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                  Business Information
                </h3>
                
                <FormField
                  control={form.control}
                  name="businessLegalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Legal Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your business legal name"
                          className="h-11"
                        />
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
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
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
              </div>
            )}

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Address Information
              </h3>
              
              <FormField
                control={form.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                       <GooglePlacesAutocompleteV2
                         placeholder="Start typing your address..."
                         onAddressSelect={handleAddressSelect}
                         className="h-11"
                         value={field.value}
                         onChange={field.onChange}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address2Type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address 2 Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ADDRESS_2_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="address2Value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address 2 Value</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 4B, 12A"
                          className="h-11"
                          maxLength={5}
                          onChange={(e) => {
                            field.onChange(e.target.value.toUpperCase());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your city"
                          className="h-11"
                        />
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
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select your state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
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
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="12345"
                          className="h-11"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">
                Password
              </h3>
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    {watchPassword && (
                      <div className="space-y-2">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Password strength: <span className="font-medium">{getPasswordStrengthText()}</span>
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Terms and Notifications */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer text-sm">
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary hover:underline">
                          terms of service
                        </Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-primary hover:underline">
                          privacy policy
                        </Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer text-sm">
                        I agree to receive notifications and messages from MuniNow
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <div className="flex justify-center py-2 mb-4">
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isCreatingAccount || isCheckingEmail}
              >
                {isCreatingAccount || isCheckingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Continue to Verification
              </Button>
            </div>
          </form>
        </Form>
        )}

        {/* Step 2: Address Verification */}
        {currentStep === 2 && formData && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Verify Your Address
              </h3>
              <p className="text-muted-foreground mb-6">
                Please confirm the address you entered is correct
              </p>
            </div>

            <div className={`p-6 rounded-lg border-2 transition-all duration-300 ${
              addressStatus === 'checking' ? 'border-muted bg-muted/20' :
              addressStatus === 'duplicate' ? 'border-destructive bg-destructive/10' :
              addressStatus === 'available' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' :
              'border-muted bg-muted/20'
            }`}>
              <div className="space-y-2">
                <div className="font-medium">
                  {formData.streetAddress}
                  {formData.address2Type && formData.address2Value && 
                    `, ${formData.address2Type} ${formData.address2Value}`
                  }
                </div>
                <div className="text-muted-foreground">
                  {formData.city}, {formData.state} {formData.zipCode}
                </div>
              </div>

              {addressStatus === 'checking' && (
                <div className="flex items-center mt-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking address availability...
                </div>
              )}

              {addressStatus === 'duplicate' && (
                <div className="mt-4 text-destructive font-medium">
                  ⚠️ Address already exists in our system
                </div>
              )}

            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={goBack}
                className="flex-1"
                disabled={isCheckingAddress}
              >
                Edit Address
              </Button>
              
              {addressStatus === 'available' && (
                <Button
                  onClick={confirmAddress}
                  className="flex-1"
                  disabled={isCheckingAddress}
                >
                  Confirm Address
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Multi-Factor Authentication */}
        {currentStep === 3 && formData && (
          <MFAVerificationStep
            defaultEmail={formData.email}
            defaultPhone={formData.mobileNumber}
            onVerificationComplete={completeMFA}
            onBack={goBack}
          />
        )}

        {/* Step 4: Success */}
        {currentStep === 4 && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✅</span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Account Created Successfully!
              </h3>
              <p className="text-muted-foreground">
                Please check your email to verify your account and complete the setup.
              </p>
            </div>

            <Button
              onClick={() => window.location.href = '/signin'}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};