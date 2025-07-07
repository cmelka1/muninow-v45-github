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

type Step1FormData = z.infer<typeof step1Schema>;

export const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      entityType: 'government',
      ownershipType: 'public',
      entityWebsite: 'https://',
      country: 'USA',
    },
  });

  const onSubmit = (data: Step1FormData) => {
    console.log('Step 1 data:', data);
    // TODO: Move to step 2 when implemented
    onOpenChange(false);
  };

  const handleAddressSelect = (addressComponents: any) => {
    form.setValue('addressLine1', addressComponents.streetAddress);
    form.setValue('city', addressComponents.city);
    form.setValue('state', addressComponents.state);
    form.setValue('zipCode', addressComponents.zipCode);
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
                Step 2
              </span>
              <span className={currentStep >= 3 ? 'font-medium text-foreground' : ''}>
                Step 3
              </span>
            </div>
          </div>
        </DialogHeader>

        {currentStep === 1 && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Entity Type */}
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                control={form.control}
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
                control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                control={form.control}
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
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl>
                        <GooglePlacesAutocompleteV2
                          placeholder="Start typing address..."
                          value={field.value}
                          onChange={field.onChange}
                          onAddressSelect={handleAddressSelect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Line 2 */}
                <FormField
                  control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                  control={form.control}
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
      </DialogContent>
    </Dialog>
  );
};