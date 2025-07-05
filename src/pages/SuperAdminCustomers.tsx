import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

// Define the Finix seller identity schema
const finixSellerSchema = z.object({
  business_type: z.enum([
    'INDIVIDUAL_SOLE_PROPRIETORSHIP',
    'LIMITED_LIABILITY_COMPANY', 
    'CORPORATION',
    'PARTNERSHIP',
    'NON_PROFIT',
    'GOVERNMENT_AGENCY'
  ]),
  business_name: z.string().min(1, 'Business name is required'),
  business_tax_id: z.string().min(9, 'Tax ID must be at least 9 digits'),
  business_phone: z.string().min(10, 'Phone number is required'),
  business_url: z.string().url().optional().or(z.literal('')),
  incorporation_date: z.string(),
  ownership_type: z.enum(['PRIVATE', 'PUBLIC', 'GOVERNMENT']),
  doing_business_as: z.string().optional(),
  business_address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    region: z.string().min(2, 'State is required'),
    postal_code: z.string().min(5, 'Zip code is required'),
    country: z.string().default('USA')
  }),
  principal: z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    title: z.enum(['CEO', 'CFO', 'COO', 'President', 'Owner', 'Partner', 'Director', 'Manager', 'Other']),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Phone number is required'),
    date_of_birth: z.string(),
    ssn: z.string().min(4, 'SSN is required'),
    address: z.object({
      line1: z.string().min(1, 'Address line 1 is required'),
      line2: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      region: z.string().min(2, 'State is required'),
      postal_code: z.string().min(5, 'Zip code is required'),
      country: z.string().default('USA')
    })
  }).optional()
}).refine((data) => {
  // Principal is required for all business types except GOVERNMENT_AGENCY
  if (data.business_type !== 'GOVERNMENT_AGENCY' && !data.principal) {
    return false;
  }
  return true;
}, {
  message: "Control owner information is required for this business type",
  path: ["principal"]
});

type FinixSellerFormData = z.infer<typeof finixSellerSchema>;

const businessTypeOptions = [
  { label: 'Individual / Sole Proprietor', value: 'INDIVIDUAL_SOLE_PROPRIETORSHIP' },
  { label: 'Limited Liability Company (LLC)', value: 'LIMITED_LIABILITY_COMPANY' },
  { label: 'Corporation', value: 'CORPORATION' },
  { label: 'Partnership', value: 'PARTNERSHIP' },
  { label: 'Non-Profit', value: 'NON_PROFIT' },
  { label: 'Government Agency', value: 'GOVERNMENT_AGENCY' }
];

const ownershipTypeOptions = [
  { label: 'Private', value: 'PRIVATE' },
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Government', value: 'GOVERNMENT' }
];

const titleOptions = [
  { label: 'CEO', value: 'CEO' },
  { label: 'CFO', value: 'CFO' },
  { label: 'COO', value: 'COO' },
  { label: 'President', value: 'President' },
  { label: 'Owner', value: 'Owner' },
  { label: 'Partner', value: 'Partner' },
  { label: 'Director', value: 'Director' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Other', value: 'Other' }
];

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const SuperAdminCustomers = () => {
  const { toast } = useToast();

  const form = useForm<FinixSellerFormData>({
    resolver: zodResolver(finixSellerSchema),
    defaultValues: {
      business_type: undefined,
      business_name: '',
      business_tax_id: '',
      business_phone: '',
      business_url: '',
      incorporation_date: '',
      ownership_type: 'PRIVATE',
      doing_business_as: '',
      business_address: {
        line1: '',
        line2: '',
        city: '',
        region: '',
        postal_code: '',
        country: 'USA'
      },
      principal: {
        first_name: '',
        last_name: '',
        title: undefined,
        email: '',
        phone: '',
        date_of_birth: '',
        ssn: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          region: '',
          postal_code: '',
          country: 'USA'
        }
      }
    }
  });

  const watchBusinessType = form.watch('business_type');
  const showPrincipalSection = watchBusinessType && watchBusinessType !== 'GOVERNMENT_AGENCY';

  const onSubmit = async (data: FinixSellerFormData) => {
    try {
      console.log('Finix Seller Identity Payload:', JSON.stringify(data, null, 2));
      
      toast({
        title: "Seller Identity Created",
        description: "Finix seller identity payload generated successfully. Check console for details.",
      });

      // TODO: Integrate with Finix API endpoint
      // const response = await fetch('/api/finix/identities', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });

      form.reset();
    } catch (error) {
      console.error('Seller identity creation error:', error);
      toast({
        title: "Error creating seller identity",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <SuperAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finix Seller Onboarding
          </h1>
          <p className="text-gray-600">
            Create comprehensive seller identity for Finix payment processing
          </p>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Create Finix Seller Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Business Type Selector */}
                <FormField
                  control={form.control}
                  name="business_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessTypeOptions.map((option) => (
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

                {/* Business Information Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Business Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Legal business name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_tax_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Tax ID (EIN or SSN) *</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="business_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="business_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.business.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="incorporation_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incorporation Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownership_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ownership Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ownershipTypeOptions.map((option) => (
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

                  <FormField
                    control={form.control}
                    name="doing_business_as"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doing Business As (DBA)</FormLabel>
                        <FormControl>
                          <Input placeholder="Trade name (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Business Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Business Address</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="business_address.line1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1 *</FormLabel>
                              <FormControl>
                                <Input placeholder="Street address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="business_address.line2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2</FormLabel>
                            <FormControl>
                              <Input placeholder="Suite, apt, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="business_address.city"
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

                      <FormField
                        control={form.control}
                        name="business_address.region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="State" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {usStates.map((state) => (
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
                        name="business_address.postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="business_address.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country *</FormLabel>
                            <FormControl>
                              <Input value="USA" disabled {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Control Owner Section - Conditional */}
                {showPrincipalSection && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Control Owner Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="principal.first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="principal.last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="principal.title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select title" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {titleOptions.map((option) => (
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

                      <FormField
                        control={form.control}
                        name="principal.email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="principal.phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="principal.date_of_birth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="principal.ssn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SSN (Last 4 or Full) *</FormLabel>
                            <FormControl>
                              <Input placeholder="1234 or 123-45-6789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Control Owner Address */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Control Owner Address</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name="principal.address.line1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Line 1 *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Street address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="principal.address.line2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2</FormLabel>
                              <FormControl>
                                <Input placeholder="Suite, apt, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="principal.address.city"
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

                        <FormField
                          control={form.control}
                          name="principal.address.region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="State" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {usStates.map((state) => (
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
                          name="principal.address.postal_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code *</FormLabel>
                              <FormControl>
                                <Input placeholder="12345" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="principal.address.country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country *</FormLabel>
                              <FormControl>
                                <Input value="USA" disabled {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg">
                  Create Finix Seller Identity
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCustomers;