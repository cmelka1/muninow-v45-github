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
        <h3 className="text-lg font-semibold mb-4">Entity Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <FormField
            control={form.control}
            name="businessInformation.businessType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entity Type *</FormLabel>
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
                <FormLabel>Legal Entity Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter entity name" {...field} />
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
                <FormLabel>Entity Tax ID (EIN/SSN) *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter tax ID (9 digits)" 
                    maxLength={9}
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9);
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
                <FormLabel>Entity Phone *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(xxx) xxx-xxxx" 
                    {...field}
                    onChange={(e) => {
                      const input = e.target.value;
                      const cursorPosition = e.target.selectionStart;
                      
                      // Strip all non-digits to get clean number
                      const digits = input.replace(/\D/g, '');
                      
                      // Store only digits in form state
                      field.onChange(digits);
                      
                      // Format for display
                      let formatted = '';
                      if (digits.length >= 10) {
                        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
                      } else if (digits.length >= 6) {
                        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                      } else if (digits.length >= 3) {
                        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                      } else if (digits.length > 0) {
                        formatted = `(${digits}`;
                      } else {
                        formatted = '';
                      }
                      
                      // Update input value
                      e.target.value = formatted;
                    }}
                    onKeyDown={(e) => {
                      // Allow backspace to work naturally
                      if (e.key === 'Backspace') {
                        const input = e.target as HTMLInputElement;
                        const cursorPosition = input.selectionStart;
                        const currentValue = input.value;
                        
                        // If cursor is after a formatting character, move it back
                        if (cursorPosition && cursorPosition > 0) {
                          const charBefore = currentValue[cursorPosition - 1];
                          if (charBefore === ')' || charBefore === ' ' || charBefore === '-') {
                            e.preventDefault();
                            const digits = currentValue.replace(/\D/g, '');
                            const newDigits = digits.slice(0, -1);
                            field.onChange(newDigits);
                            
                            // Format new value
                            let formatted = '';
                            if (newDigits.length >= 10) {
                              formatted = `(${newDigits.slice(0, 3)}) ${newDigits.slice(3, 6)}-${newDigits.slice(6, 10)}`;
                            } else if (newDigits.length >= 6) {
                              formatted = `(${newDigits.slice(0, 3)}) ${newDigits.slice(3, 6)}-${newDigits.slice(6)}`;
                            } else if (newDigits.length >= 3) {
                              formatted = `(${newDigits.slice(0, 3)}) ${newDigits.slice(3)}`;
                            } else if (newDigits.length > 0) {
                              formatted = `(${newDigits}`;
                            }
                            
                            input.value = formatted;
                          }
                        }
                      }
                    }}
                    value={(() => {
                      const digits = field.value || '';
                      if (digits.length >= 10) {
                        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
                      } else if (digits.length >= 6) {
                        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                      } else if (digits.length >= 3) {
                        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                      } else if (digits.length > 0) {
                        return `(${digits}`;
                      }
                      return '';
                    })()}
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
                <FormLabel>Entity Website *</FormLabel>
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
              <FormLabel>Entity Description *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your entity and what products/services you offer"
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
        <h4 className="text-md font-semibold mb-4">Entity Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <FormField
            control={form.control}
            name="businessInformation.businessAddress.line1"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address Line 1 *</FormLabel>
                <FormControl>
                  <GooglePlacesAutocomplete
                    placeholder="Enter entity address"
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
                  <Input placeholder="USA" {...field} disabled />
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