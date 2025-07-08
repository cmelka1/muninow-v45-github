import React from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ENTITY_TYPES = [
  { value: 'INDIVIDUAL_SOLE_PROPRIETORSHIP', label: 'Individual / Sole Proprietorship' },
  { value: 'LIMITED_LIABILITY_COMPANY', label: 'Limited Liability Company (LLC)' },
  { value: 'CORPORATION', label: 'Corporation' },
  { value: 'TAX_EXEMPT_ORGANIZATION', label: 'Tax Exempt Organization' },
  { value: 'GOVERNMENT_AGENCY', label: 'Government Agency' },
];

const OWNERSHIP_TYPES = [
  { value: 'PRIVATE', label: 'Private' },
  { value: 'PUBLIC', label: 'Public' },
];

const REFUND_POLICY_OPTIONS = [
  { value: 'NO_REFUNDS', label: 'No Refunds' },
  { value: 'MERCHANDISE_EXCHANGE_ONLY', label: 'Merchandise Exchange Only' },
  { value: 'WITHIN_30_DAYS', label: 'Within 30 Days' },
  { value: 'OTHER', label: 'Other' },
];

const customerSchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  ownershipType: z.string().min(1, 'Ownership type is required'),
  legalEntityName: z.string().min(1, 'Legal entity name is required'),
  doingBusinessAs: z.string().min(1, 'Doing business as name is required'),
  taxId: z.string().min(9, 'Tax ID must be exactly 9 digits').max(9, 'Tax ID must be exactly 9 digits'),
  entityPhone: z.string().min(10, 'Valid phone number is required'),
  entityWebsite: z.string().url('Please enter a valid website URL').optional(),
  incorporationDate: z.date().optional(),
  entityDescription: z.string().min(10, 'Please provide a detailed description'),
  businessAddressLine1: z.string().min(1, 'Address is required'),
  businessAddressLine2: z.string().optional(),
  businessCity: z.string().min(1, 'City is required'),
  businessState: z.string().min(1, 'State is required'),
  businessZipCode: z.string().min(5, 'ZIP code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  workEmail: z.string().email('Please enter a valid email address'),
  personalPhone: z.string().min(10, 'Valid phone number is required'),
  dateOfBirth: z.date().optional(),
  personalTaxId: z.string().optional(),
  ownershipPercentage: z.number().min(0).max(100).default(0),
  personalAddressLine1: z.string().min(1, 'Address is required'),
  personalAddressLine2: z.string().optional(),
  personalCity: z.string().min(1, 'City is required'),
  personalState: z.string().min(1, 'State is required'),
  personalZipCode: z.string().min(5, 'ZIP code is required'),
  annualAchVolume: z.number().min(0).default(0),
  annualCardVolume: z.number().min(0).default(0),
  averageAchAmount: z.number().min(0).default(0),
  averageCardAmount: z.number().min(0).default(0),
  maxAchAmount: z.number().min(0).default(0),
  maxCardAmount: z.number().min(0).default(0),
  mccCode: z.string().length(4, 'MCC code must be exactly 4 digits'),
  cardPresentPercentage: z.number().min(0).max(100).default(0),
  motoPercentage: z.number().min(0).max(100).default(0),
  ecommercePercentage: z.number().min(0).max(100).default(100),
  b2bPercentage: z.number().min(0).max(100).default(0),
  b2cPercentage: z.number().min(0).max(100).default(100),
  p2pPercentage: z.number().min(0).max(100).default(0),
  hasAcceptedCardsPreviously: z.boolean().default(false),
  refundPolicy: z.string().default('NO_REFUNDS'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const defaultValues = {
  entityType: '',
  ownershipType: '',
  legalEntityName: '',
  doingBusinessAs: '',
  taxId: '',
  entityPhone: '',
  entityWebsite: '',
  incorporationDate: undefined as Date | undefined,
  entityDescription: '',
  businessAddressLine1: '',
  businessAddressLine2: '',
  businessCity: '',
  businessState: '',
  businessZipCode: '',
  firstName: '',
  lastName: '',
  jobTitle: '',
  workEmail: '',
  personalPhone: '',
  dateOfBirth: undefined as Date | undefined,
  personalTaxId: '',
  ownershipPercentage: 0,
  personalAddressLine1: '',
  personalAddressLine2: '',
  personalCity: '',
  personalState: '',
  personalZipCode: '',
  annualAchVolume: 0,
  annualCardVolume: 0,
  averageAchAmount: 0,
  averageCardAmount: 0,
  maxAchAmount: 0,
  maxCardAmount: 0,
  mccCode: '',
  cardPresentPercentage: 0,
  motoPercentage: 0,
  ecommercePercentage: 100,
  b2bPercentage: 0,
  b2cPercentage: 100,
  p2pPercentage: 0,
  hasAcceptedCardsPreviously: false,
  refundPolicy: 'NO_REFUNDS',
};

export const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      // Transform dates to Finix format
      const transformDateForFinix = (date: Date | undefined) => 
        date ? {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        } : null;

      const customerData = {
        user_id: user?.id,
        entity_type: data.entityType,
        ownership_type: data.ownershipType,
        legal_entity_name: data.legalEntityName,
        doing_business_as: data.doingBusinessAs,
        tax_id: data.taxId,
        entity_phone: data.entityPhone,
        entity_website: data.entityWebsite || null,
        incorporation_date: transformDateForFinix(data.incorporationDate),
        entity_description: data.entityDescription,
        business_address_line1: data.businessAddressLine1,
        business_address_line2: data.businessAddressLine2 || null,
        business_city: data.businessCity,
        business_state: data.businessState,
        business_zip_code: data.businessZipCode,
        first_name: data.firstName,
        last_name: data.lastName,
        job_title: data.jobTitle,
        work_email: data.workEmail,
        personal_phone: data.personalPhone,
        date_of_birth: transformDateForFinix(data.dateOfBirth),
        personal_tax_id: data.personalTaxId || null,
        ownership_percentage: data.ownershipPercentage,
        personal_address_line1: data.personalAddressLine1,
        personal_address_line2: data.personalAddressLine2 || null,
        personal_city: data.personalCity,
        personal_state: data.personalState,
        personal_zip_code: data.personalZipCode,
        annual_ach_volume: data.annualAchVolume,
        annual_card_volume: data.annualCardVolume,
        average_ach_amount: data.averageAchAmount,
        average_card_amount: data.averageCardAmount,
        max_ach_amount: data.maxAchAmount,
        max_card_amount: data.maxCardAmount,
        mcc_code: data.mccCode,
        card_present_percentage: data.cardPresentPercentage,
        moto_percentage: data.motoPercentage,
        ecommerce_percentage: data.ecommercePercentage,
        b2b_percentage: data.b2bPercentage,
        b2c_percentage: data.b2cPercentage,
        p2p_percentage: data.p2pPercentage,
        has_accepted_cards_previously: data.hasAcceptedCardsPreviously,
        refund_policy: data.refundPolicy,
      };

      const { error } = await supabase
        .from('customers')
        .insert(customerData);

      if (error) throw error;

      toast.success('Customer added successfully!');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Entity Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Entity Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField
                  control={form.control}
                  name="ownershipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

              <div className="grid grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="doingBusinessAs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doing Business As *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter DBA name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789" {...field} maxLength={9} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entityPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entityWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="entityDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Description *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the business..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Business Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Address</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessAddressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessAddressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Suite 100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="businessCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input placeholder="CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="94102" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Principal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Principal Information</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="CEO" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Email *</FormLabel>
                      <FormControl>
                        <Input placeholder="john@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Personal Address */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalAddressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Address Line 1 *</FormLabel>
                      <FormControl>
                        <Input placeholder="456 Oak St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalAddressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt 2B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="personalCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal City *</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal State *</FormLabel>
                      <FormControl>
                        <Input placeholder="CA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal ZIP Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="94102" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Processing Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Processing Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="annualCardVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Card Volume</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mccCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MCC Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="4900" {...field} maxLength={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="refundPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund Policy</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Customer</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};