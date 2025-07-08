import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GooglePlacesAutocompleteV2 } from '@/components/ui/google-places-autocomplete-v2';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { normalizePhoneInput } from '@/lib/phoneUtils';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Entity types for the dropdown
const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual / Sole Proprietorship' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'tax_exempt', label: 'Tax Exempt Organization' },
  { value: 'government', label: 'Government Agency' },
];

// Ownership types
const OWNERSHIP_TYPES = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
];

// Step 1 schema
const step1Schema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  ownershipType: z.string().min(1, 'Ownership type is required'),
  legalEntityName: z.string().min(1, 'Legal entity name is required'),
  doingBusinessAs: z.string().min(1, 'Doing business as name is required'),
  taxId: z.string()
    .min(9, 'Tax ID must be exactly 9 digits')
    .max(9, 'Tax ID must be exactly 9 digits')
    .regex(/^\d{9}$/, 'Tax ID must contain only digits'),
  entityPhone: z.string().min(14, 'Valid phone number is required'),
  entityWebsite: z.string().url('Please enter a valid website URL'),
  incorporationDate: z.union([
    z.date(),
    z.string().regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
  ]).transform((val) => {
    if (val instanceof Date) return val;
    const [month, day, year] = val.split('/').map(Number);
    return new Date(year, month - 1, day);
  }),
  entityDescription: z.string().min(10, 'Please provide a detailed description'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code is required'),
  country: z.string().default('USA'),
});

// Step 2 schema with conditional validation
const step2Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  workEmail: z.string().email('Please enter a valid email address'),
  personalPhone: z.string().min(14, 'Valid phone number is required'),
  dateOfBirth: z.union([
    z.date(),
    z.string().regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
  ]).transform((val) => {
    if (val instanceof Date) return val;
    const [month, day, year] = val.split('/').map(Number);
    return new Date(year, month - 1, day);
  }).optional(),
  personalTaxId: z.string().optional(),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  personalAddressLine1: z.string().min(1, 'Address is required'),
  personalAddressLine2: z.string().optional(),
  personalCity: z.string().min(1, 'City is required'),
  personalState: z.string().min(1, 'State is required'),
  personalZipCode: z.string().min(5, 'ZIP code is required'),
  personalCountry: z.string().default('USA'),
});

// Step 3 schema for processing information
const step3Schema = z.object({
  annualAchVolume: z.number().min(0).default(0),
  annualCardVolume: z.number().min(0).default(0),
  averageAchAmount: z.number().min(0).default(0),
  averageCardAmount: z.number().min(0).default(0),
  maxAchAmount: z.number().min(0).max(9999).default(0),
  maxCardAmount: z.number().min(0).max(9999).default(0),
  mccCode: z.string().length(4, 'MCC code must be exactly 4 digits').regex(/^\d{4}$/, 'MCC code must contain only digits'),
  cardPresentPercent: z.number().min(0).max(100).default(0),
  motoPercent: z.number().min(0).max(100).default(0),
  ecommercePercent: z.number().min(0).max(100).default(100),
  b2bPercent: z.number().min(0).max(100).default(0),
  b2cPercent: z.number().min(0).max(100).default(100),
  p2pPercent: z.number().min(0).max(100).default(0),
  hasAcceptedCardsPreviously: z.boolean().default(false),
  refundPolicy: z.enum(['no_refunds', 'merchandise_exchange', 'within_30_days', 'other']).default('no_refunds'),
}).refine((data) => {
  const cardTotal = data.cardPresentPercent + data.motoPercent + data.ecommercePercent;
  return cardTotal === 100;
}, {
  message: 'Card volume distribution must total 100%',
  path: ['cardVolume']
}).refine((data) => {
  const businessTotal = data.b2bPercent + data.b2cPercent + data.p2pPercent;
  return businessTotal === 100;
}, {
  message: 'Business volume distribution must total 100%',
  path: ['businessVolume']
});

type Step1FormData = z.infer<typeof step1Schema>;
type Step2FormData = z.infer<typeof step2Schema>;
type Step3FormData = z.infer<typeof step3Schema>;

const REFUND_POLICY_OPTIONS = [
  { value: 'no_refunds', label: 'No Refunds' },
  { value: 'merchandise_exchange', label: 'Merchandise Exchange Only' },
  { value: 'within_30_days', label: 'Within 30 Days' },
  { value: 'other', label: 'Other' },
];

export const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { createCustomer, isLoading: isSubmitting } = useCustomers();
  const [currentStep, setCurrentStep] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dobCalendarOpen, setDobCalendarOpen] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [step2Data, setStep2Data] = useState<Step2FormData | null>(null);

  const step1Form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      entityType: 'government',
      ownershipType: 'public',
      entityWebsite: 'https://',
      country: 'USA',
    },
  });

  const step2Form = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      ownershipPercentage: 100,
      personalCountry: 'USA',
    },
  });

  const step3Form = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      annualAchVolume: 0,
      annualCardVolume: 0,
      averageAchAmount: 0,
      averageCardAmount: 0,
      maxAchAmount: 0,
      maxCardAmount: 0,
      cardPresentPercent: 0,
      motoPercent: 0,
      ecommercePercent: 100,
      b2bPercent: 0,
      b2cPercent: 100,
      p2pPercent: 0,
      hasAcceptedCardsPreviously: false,
      refundPolicy: 'no_refunds',
    },
  });

  const isGovernmentEntity = step1Data?.entityType === 'government';

  const onStep1Submit = (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
    // Scroll to top of dialog content
    setTimeout(() => {
      const dialogContent = document.querySelector('[role="dialog"] .overflow-y-auto');
      if (dialogContent) {
        dialogContent.scrollTop = 0;
      }
    }, 0);
  };

  const onStep2Submit = (data: Step2FormData) => {
    setStep2Data(data);
    setCurrentStep(3);
    // Scroll to top of dialog content
    setTimeout(() => {
      const dialogContent = document.querySelector('[role="dialog"] .overflow-y-auto');
      if (dialogContent) {
        dialogContent.scrollTop = 0;
      }
    }, 0);
  };

  const onStep3Submit = async (data: Step3FormData) => {
    if (!step1Data || !step2Data) return;
    
    try {
      const formData = {
        // Step 1 data
        entityType: step1Data.entityType,
        ownershipType: step1Data.ownershipType,
        legalEntityName: step1Data.legalEntityName,
        doingBusinessAs: step1Data.doingBusinessAs,
        taxId: step1Data.taxId,
        entityPhone: step1Data.entityPhone,
        entityWebsite: step1Data.entityWebsite,
        incorporationDate: step1Data.incorporationDate,
        entityDescription: step1Data.entityDescription,
        addressLine1: step1Data.addressLine1,
        addressLine2: step1Data.addressLine2,
        city: step1Data.city,
        state: step1Data.state,
        zipCode: step1Data.zipCode,
        country: step1Data.country,
        
        // Step 2 data
        firstName: step2Data.firstName,
        lastName: step2Data.lastName,
        jobTitle: step2Data.jobTitle,
        workEmail: step2Data.workEmail,
        personalPhone: step2Data.personalPhone,
        dateOfBirth: step2Data.dateOfBirth,
        personalTaxId: step2Data.personalTaxId,
        ownershipPercentage: step2Data.ownershipPercentage,
        personalAddressLine1: step2Data.personalAddressLine1,
        personalAddressLine2: step2Data.personalAddressLine2,
        personalCity: step2Data.personalCity,
        personalState: step2Data.personalState,
        personalZipCode: step2Data.personalZipCode,
        personalCountry: step2Data.personalCountry,
        
        // Step 3 data
        annualAchVolume: data.annualAchVolume,
        annualCardVolume: data.annualCardVolume,
        averageAchAmount: data.averageAchAmount,
        averageCardAmount: data.averageCardAmount,
        maxAchAmount: data.maxAchAmount,
        maxCardAmount: data.maxCardAmount,
        mccCode: data.mccCode,
        cardPresentPercent: data.cardPresentPercent,
        motoPercent: data.motoPercent,
        ecommercePercent: data.ecommercePercent,
        b2bPercent: data.b2bPercent,
        b2cPercent: data.b2cPercent,
        p2pPercent: data.p2pPercent,
        hasAcceptedCardsPreviously: data.hasAcceptedCardsPreviously,
        refundPolicy: data.refundPolicy
      };

      await createCustomer(formData);
      
      // Reset forms
      step1Form.reset();
      step2Form.reset();
      step3Form.reset();
      setStep1Data(null);
      setStep2Data(null);
      setCurrentStep(1);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
    // Scroll to top of dialog content
    setTimeout(() => {
      const dialogContent = document.querySelector('[role="dialog"] .overflow-y-auto');
      if (dialogContent) {
        dialogContent.scrollTop = 0;
      }
    }, 0);
  };

  const goBackToStep2 = () => {
    setCurrentStep(2);
    // Scroll to top of dialog content
    setTimeout(() => {
      const dialogContent = document.querySelector('[role="dialog"] .overflow-y-auto');
      if (dialogContent) {
        dialogContent.scrollTop = 0;
      }
    }, 0);
  };

  const handleStep1AddressSelect = (addressComponents: any) => {
    step1Form.setValue('addressLine1', addressComponents.streetAddress);
    step1Form.setValue('city', addressComponents.city);
    step1Form.setValue('state', addressComponents.state);
    step1Form.setValue('zipCode', addressComponents.zipCode);
  };

  const handleStep2AddressSelect = (addressComponents: any) => {
    step2Form.setValue('personalAddressLine1', addressComponents.streetAddress);
    step2Form.setValue('personalCity', addressComponents.city);
    step2Form.setValue('personalState', addressComponents.state);
    step2Form.setValue('personalZipCode', addressComponents.zipCode);
  };

  const formatPersonalTaxId = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 9);
  };

  const formatTaxId = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 9);
  };

  const formatZipCode = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 5);
  };

  const formatDateInput = (value: string, currentValue: string = '') => {
    // If user is backspacing and current value is longer, handle it gracefully
    if (value.length < currentValue.length) {
      // Remove slashes and reformat from scratch
      const digitsOnly = value.replace(/\D/g, '');
      return formatDateString(digitsOnly);
    }
    
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    return formatDateString(digitsOnly);
  };

  const formatDateString = (digitsOnly: string) => {
    if (digitsOnly.length === 0) return '';
    
    // Handle month validation (max 12)
    if (digitsOnly.length >= 2) {
      const month = parseInt(digitsOnly.slice(0, 2));
      if (month > 12) {
        digitsOnly = '12' + digitsOnly.slice(2);
      } else if (month === 0) {
        digitsOnly = '01' + digitsOnly.slice(2);
      }
    }
    
    // Handle day validation (max 31)
    if (digitsOnly.length >= 4) {
      const day = parseInt(digitsOnly.slice(2, 4));
      if (day > 31) {
        digitsOnly = digitsOnly.slice(0, 2) + '31' + digitsOnly.slice(4);
      } else if (day === 0) {
        digitsOnly = digitsOnly.slice(0, 2) + '01' + digitsOnly.slice(4);
      }
    }
    
    // Format as MM/DD/YYYY
    if (digitsOnly.length >= 8) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    } else if (digitsOnly.length >= 4) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
    } else if (digitsOnly.length >= 2) {
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
    }
    return digitsOnly;
  };

  const getDateDisplayValue = (value: Date | string | undefined) => {
    if (!value) return '';
    if (value instanceof Date) {
      return format(value, 'MM/dd/yyyy');
    }
    return value;
  };

  const progressValue = (currentStep / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Add New Customer - Step {currentStep} of 3
          </DialogTitle>
          <div className="mt-4">
            <Progress value={progressValue} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span className={currentStep >= 1 ? 'font-medium text-foreground' : ''}>
                Entity Information
              </span>
              <span className={currentStep >= 2 ? 'font-medium text-foreground' : ''}>
                Owner Information
              </span>
              <span className={currentStep >= 3 ? 'font-medium text-foreground' : ''}>
                Final Details
              </span>
            </div>
          </div>
        </DialogHeader>

        {currentStep === 1 && (
          <Form {...step1Form}>
            <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Entity Type */}
                <FormField
                  control={step1Form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ENTITY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Ownership Type */}
                <FormField
                  control={step1Form.control}
                  name="ownershipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ownership type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OWNERSHIP_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Legal Entity Name */}
              <FormField
                control={step1Form.control}
                name="legalEntityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Entity Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter legal entity name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Doing Business As */}
              <FormField
                control={step1Form.control}
                name="doingBusinessAs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doing Business As (DBA) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter DBA name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tax ID */}
                <FormField
                  control={step1Form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Tax ID (EIN/SSN) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456789"
                          value={field.value}
                          onChange={(e) => field.onChange(formatTaxId(e.target.value))}
                          maxLength={9}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Entity Phone */}
                <FormField
                  control={step1Form.control}
                  name="entityPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Phone *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={field.value}
                          onChange={(e) => field.onChange(normalizePhoneInput(e.target.value))}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Entity Website */}
                <FormField
                  control={step1Form.control}
                  name="entityWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Website *</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Incorporation Date */}
                <FormField
                  control={step1Form.control}
                  name="incorporationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incorporation Date *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="MM/DD/YYYY"
                            value={getDateDisplayValue(field.value)}
                            onChange={(e) => {
                              const currentValue = getDateDisplayValue(field.value);
                              const formatted = formatDateInput(e.target.value, currentValue);
                              field.onChange(formatted);
                            }}
                            maxLength={10}
                            className="flex-1"
                          />
                        </FormControl>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value instanceof Date ? field.value : undefined}
                              onSelect={(date) => {
                                field.onChange(date);
                                setCalendarOpen(false);
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Entity Description */}
              <FormField
                control={step1Form.control}
                name="entityDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the products or services offered by this entity..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Entity Address</h3>
                
                {/* Address Line 1 - Google Places */}
                <FormField
                  control={step1Form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl>
                        <GooglePlacesAutocompleteV2
                          placeholder="Start typing address..."
                          value={field.value}
                          onChange={field.onChange}
                          onAddressSelect={handleStep1AddressSelect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Line 2 */}
                <FormField
                  control={step1Form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Suite, unit, building, floor (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* City */}
                  <FormField
                    control={step1Form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* State */}
                  <FormField
                    control={step1Form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ZIP Code */}
                  <FormField
                    control={step1Form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12345"
                            value={field.value}
                            onChange={(e) => field.onChange(formatZipCode(e.target.value))}
                            maxLength={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Country - Disabled */}
                <FormField
                  control={step1Form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input disabled value="USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex items-center gap-2">
                  Next Step
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {currentStep === 2 && (
          <Form {...step2Form}>
            <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium">
                  {isGovernmentEntity ? 'Contact Person Information' : 'Control Owner / Principal Information'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isGovernmentEntity 
                    ? 'Provide information for the primary contact person'
                    : 'Provide information for the control owner or principal of the entity'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <FormField
                  control={step2Form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Last Name */}
                <FormField
                  control={step2Form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Job Title */}
              <FormField
                control={step2Form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter job title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Work Email */}
                <FormField
                  control={step2Form.control}
                  name="workEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter work email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Personal Phone */}
                <FormField
                  control={step2Form.control}
                  name="personalPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Phone *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={field.value}
                          onChange={(e) => field.onChange(normalizePhoneInput(e.target.value))}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Conditional Fields - Hidden for Government */}
              {!isGovernmentEntity && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-md font-medium">Additional Owner Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date of Birth */}
                    <FormField
                      control={step2Form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                placeholder="MM/DD/YYYY"
                                value={getDateDisplayValue(field.value)}
                                onChange={(e) => {
                                  const currentValue = getDateDisplayValue(field.value);
                                  const formatted = formatDateInput(e.target.value, currentValue);
                                  field.onChange(formatted);
                                }}
                                maxLength={10}
                                className="flex-1"
                              />
                            </FormControl>
                            <Popover open={dobCalendarOpen} onOpenChange={setDobCalendarOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="shrink-0"
                                >
                                  <CalendarIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value instanceof Date ? field.value : undefined}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    setDobCalendarOpen(false);
                                  }}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Personal Tax ID */}
                    <FormField
                      control={step2Form.control}
                      name="personalTaxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personal Tax ID (SSN) *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123456789"
                              value={field.value}
                              onChange={(e) => field.onChange(formatPersonalTaxId(e.target.value))}
                              maxLength={9}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Ownership Percentage */}
                  <FormField
                    control={step2Form.control}
                    name="ownershipPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ownership Percentage *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            min="0"
                            max="100"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Personal Address Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-md font-medium">Personal Address</h4>
                
                {/* Personal Address Line 1 - Google Places */}
                <FormField
                  control={step2Form.control}
                  name="personalAddressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl>
                        <GooglePlacesAutocompleteV2
                          placeholder="Start typing address..."
                          value={field.value}
                          onChange={field.onChange}
                          onAddressSelect={handleStep2AddressSelect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Personal Address Line 2 */}
                <FormField
                  control={step2Form.control}
                  name="personalAddressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt, suite, unit (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Personal City */}
                  <FormField
                    control={step2Form.control}
                    name="personalCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Personal State */}
                  <FormField
                    control={step2Form.control}
                    name="personalState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Personal ZIP Code */}
                  <FormField
                    control={step2Form.control}
                    name="personalZipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12345"
                            value={field.value}
                            onChange={(e) => field.onChange(formatZipCode(e.target.value))}
                            maxLength={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Personal Country - Disabled */}
                <FormField
                  control={step2Form.control}
                  name="personalCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input disabled value="USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackToStep1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex items-center gap-2">
                  Next Step
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {currentStep === 3 && (
          <Form {...step3Form}>
            <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium">Processing Information</h3>
                <p className="text-sm text-muted-foreground">
                  Payment processing volumes, limits, and business model information
                </p>
              </div>

              {/* Processing Volumes Section */}
              <div className="space-y-4">
                <h4 className="text-md font-medium">Processing Volumes</h4>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Annual ACH Volume */}
                   <FormField
                     control={step3Form.control}
                     name="annualAchVolume"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Annual ACH Volume ($)</FormLabel>
                         <FormControl>
                           <Input
                             type="number"
                             className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                             placeholder="0"
                             min="0"
                             value={field.value}
                             onChange={(e) => field.onChange(Number(e.target.value))}
                             onFocus={(e) => {
                               if (e.target.value === '0') {
                                 field.onChange('');
                                 e.target.value = '';
                               }
                             }}
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   {/* Annual Card Volume */}
                   <FormField
                     control={step3Form.control}
                     name="annualCardVolume"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Annual Card Volume ($)</FormLabel>
                         <FormControl>
                           <Input
                             type="number"
                             className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                             placeholder="0"
                             min="0"
                             value={field.value}
                             onChange={(e) => field.onChange(Number(e.target.value))}
                             onFocus={(e) => {
                               if (e.target.value === '0') {
                                 field.onChange('');
                                 e.target.value = '';
                               }
                             }}
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   {/* Average ACH Transfer Amount */}
                   <FormField
                     control={step3Form.control}
                     name="averageAchAmount"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Average ACH Transfer Amount ($)</FormLabel>
                         <FormControl>
                           <Input
                             type="number"
                             className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                             placeholder="0"
                             min="0"
                             value={field.value}
                             onChange={(e) => field.onChange(Number(e.target.value))}
                             onFocus={(e) => {
                               if (e.target.value === '0') {
                                 field.onChange('');
                                 e.target.value = '';
                               }
                             }}
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   {/* Average Card Transfer Amount */}
                   <FormField
                     control={step3Form.control}
                     name="averageCardAmount"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Average Card Transfer Amount ($)</FormLabel>
                         <FormControl>
                           <Input
                             type="number"
                             className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                             placeholder="0"
                             min="0"
                             value={field.value}
                             onChange={(e) => field.onChange(Number(e.target.value))}
                             onFocus={(e) => {
                               if (e.target.value === '0') {
                                 field.onChange('');
                                 e.target.value = '';
                               }
                             }}
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                    {/* Maximum ACH Transaction Amount */}
                    <FormField
                      control={step3Form.control}
                      name="maxAchAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum ACH Transaction Amount ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              placeholder="0"
                              min="0"
                              max="9999"
                              value={field.value}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                field.onChange(value > 9999 ? 9999 : value);
                              }}
                              onFocus={(e) => {
                                if (e.target.value === '0') {
                                  field.onChange('');
                                  e.target.value = '';
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Maximum Card Transaction Amount */}
                    <FormField
                      control={step3Form.control}
                      name="maxCardAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Card Transaction Amount ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              placeholder="0"
                              min="0"
                              max="9999"
                              value={field.value}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                field.onChange(value > 9999 ? 9999 : value);
                              }}
                              onFocus={(e) => {
                                if (e.target.value === '0') {
                                  field.onChange('');
                                  e.target.value = '';
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
              </div>

              {/* Business Information Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-md font-medium">MCC Code (Merchant Category Code)</h4>
                  <a
                    href="https://docs.finix.com/guides/managing-operations/security-compliance/approved-merchant-category-codes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                
                <FormField
                  control={step3Form.control}
                  name="mccCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MCC Code *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="5814"
                          maxLength={4}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Card Volume Distribution */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-md font-medium">Card Volume Distribution (Must total 100%)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={step3Form.control}
                    name="cardPresentPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Present (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            max="100"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step3Form.control}
                    name="motoPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MOTO (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            max="100"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step3Form.control}
                    name="ecommercePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-commerce (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            min="0"
                            max="100"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Total: {(step3Form.watch('cardPresentPercent') || 0) + (step3Form.watch('motoPercent') || 0) + (step3Form.watch('ecommercePercent') || 0)}%
                </div>
              </div>

              {/* Business Volume Distribution */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-md font-medium">Business Volume Distribution (Must total 100%)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={step3Form.control}
                    name="b2bPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>B2B (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            max="100"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step3Form.control}
                    name="b2cPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>B2C (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            min="0"
                            max="100"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step3Form.control}
                    name="p2pPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>P2P (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            min="0"
                            max="100"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Total: {(step3Form.watch('b2bPercent') || 0) + (step3Form.watch('b2cPercent') || 0) + (step3Form.watch('p2pPercent') || 0)}%
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-md font-medium">Additional Information</h4>
                
                <FormField
                  control={step3Form.control}
                  name="hasAcceptedCardsPreviously"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Has the business accepted cards previously?
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={step3Form.control}
                  name="refundPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund Policy *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select refund policy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REFUND_POLICY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Legal Agreements & Consent */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-md font-medium">Legal Agreements & Consent</h4>
                
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    The information you provide will be used to verify your identity. Additional information may be requested.
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>By proceeding, you agree to our</span>
                      <a
                        href="/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Terms of Service
                      </a>
                      <span>and</span>
                      <a
                        href="https://finix-hosted-content.s3.amazonaws.com/flex/v3/finix-terms-of-service.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Finix Terms of Service
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackToStep2}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex items-center gap-2">
                  Complete Setup
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};