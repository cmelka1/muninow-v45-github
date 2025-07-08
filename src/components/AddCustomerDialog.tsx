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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GooglePlacesAutocompleteV2 } from '@/components/ui/google-places-autocomplete-v2';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { normalizePhoneInput } from '@/lib/phoneUtils';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  incorporationDate: z.date({
    required_error: 'Incorporation date is required',
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
  dateOfBirth: z.date().optional(),
  personalTaxId: z.string().optional(),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  personalAddressLine1: z.string().min(1, 'Address is required'),
  personalAddressLine2: z.string().optional(),
  personalCity: z.string().min(1, 'City is required'),
  personalState: z.string().min(1, 'State is required'),
  personalZipCode: z.string().min(5, 'ZIP code is required'),
  personalCountry: z.string().default('USA'),
});

type Step1FormData = z.infer<typeof step1Schema>;
type Step2FormData = z.infer<typeof step2Schema>;

export const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dobCalendarOpen, setDobCalendarOpen] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);

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

  const isGovernmentEntity = step1Data?.entityType === 'government';

  const onStep1Submit = (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const onStep2Submit = (data: Step2FormData) => {
    console.log('Step 1 data:', step1Data);
    console.log('Step 2 data:', data);
    // TODO: Move to step 3 when implemented
    onOpenChange(false);
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
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
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setCalendarOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                          <Popover open={dobCalendarOpen} onOpenChange={setDobCalendarOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setDobCalendarOpen(false);
                                }}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
      </DialogContent>
    </Dialog>
  );
};