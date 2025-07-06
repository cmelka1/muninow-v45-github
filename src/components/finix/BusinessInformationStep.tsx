import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage,
  Form
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GooglePlacesAutocomplete } from '@/components/ui/google-places-autocomplete';
import { FinixSellerFormData } from '@/schemas/finixSellerSchema';

interface BusinessInformationStepProps {
  form: UseFormReturn<FinixSellerFormData>;
}

export function BusinessInformationStep({ form }: BusinessInformationStepProps) {

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <FormField
            control={form.control}
            name="businessInformation.businessType"
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
                    <SelectItem value="INDIVIDUAL_SOLE_PROPRIETORSHIP">Individual / Sole Proprietor</SelectItem>
                    <SelectItem value="LIMITED_LIABILITY_COMPANY">Limited Liability Company (LLC)</SelectItem>
                    <SelectItem value="CORPORATION">Corporation</SelectItem>
                    <SelectItem value="TAX_EXEMPT_ORGANIZATION">Tax Exempt Organization</SelectItem>
                    <SelectItem value="GOVERNMENT_AGENCY">Government Agency</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.ownershipType"
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
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter business name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.doingBusinessAs"
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

          <FormField
            control={form.control}
            name="businessInformation.businessTaxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Tax ID (EIN/SSN) *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter tax ID" 
                    {...field}
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

          <FormField
            control={form.control}
            name="businessInformation.businessPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Phone *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter phone number" 
                    {...field}
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

          <FormField
            control={form.control}
            name="businessInformation.businessWebsite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Website *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://example.com" 
                    type="url"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.incorporationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Incorporation Date *</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="businessInformation.businessDescription"
          render={({ field }) => (
            <FormItem className="mt-6">
              <FormLabel>Business Description *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your business and what products/services you offer"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <h4 className="text-md font-semibold mb-4">Business Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <FormField
            control={form.control}
            name="businessInformation.businessAddress.line1"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address Line 1 *</FormLabel>
                <FormControl>
                  <GooglePlacesAutocomplete
                    placeholder="Enter business address"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    onAddressSelect={(addressComponents) => {
                      form.setValue('businessInformation.businessAddress.line1', addressComponents.streetAddress);
                      form.setValue('businessInformation.businessAddress.city', addressComponents.city);
                      form.setValue('businessInformation.businessAddress.state', addressComponents.state);
                      form.setValue('businessInformation.businessAddress.zipCode', addressComponents.zipCode);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.businessAddress.line2"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input placeholder="Suite, unit, building, floor, etc. (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.businessAddress.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter city" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.businessAddress.state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter state" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessInformation.businessAddress.zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter ZIP code" 
                    {...field}
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

          <FormField
            control={form.control}
            name="businessInformation.businessAddress.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <FormControl>
                  <Input placeholder="US" {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}