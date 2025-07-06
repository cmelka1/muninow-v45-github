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
import { GooglePlacesAutocomplete } from '@/components/ui/google-places-autocomplete';
import { FinixSellerFormData } from '@/schemas/finixSellerSchema';

interface OwnerInformationStepProps {
  form: UseFormReturn<FinixSellerFormData>;
  isGovernmentAgency: boolean;
}

export function OwnerInformationStep({ form, isGovernmentAgency }: OwnerInformationStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {isGovernmentAgency ? 'Contact Person Information' : 'Control Owner / Principal Information'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isGovernmentAgency 
            ? 'Provide contact information for the primary contact person.'
            : 'Provide information about the principal owner or control person of the business.'
          }
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <FormField
            control={form.control}
            name="ownerInformation.firstName"
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

          <FormField
            control={form.control}
            name="ownerInformation.lastName"
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

          <FormField
            control={form.control}
            name="ownerInformation.jobTitle"
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

          <FormField
            control={form.control}
            name="ownerInformation.workEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Email *</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="Enter work email" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ownerInformation.personalPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personal Phone *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(xxx) xxx-xxxx" 
                    {...field}
                    onChange={(e) => {
                      // Strip all non-digits
                      const digits = e.target.value.replace(/\D/g, '');
                      
                      // Format the phone number
                      let formatted = digits;
                      if (digits.length >= 6) {
                        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
                      } else if (digits.length >= 3) {
                        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                      } else if (digits.length > 0) {
                        formatted = `(${digits}`;
                      }
                      
                      // Update the input display with formatted value
                      e.target.value = formatted;
                      
                      // Store only digits in form state
                      field.onChange(digits);
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
                      return digits;
                    })()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isGovernmentAgency && (
            <>
              <FormField
                control={form.control}
                name="ownerInformation.dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
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

              <FormField
                control={form.control}
                name="ownerInformation.personalTaxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Tax ID (Last 4 of SSN) *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Last 4 digits"
                        maxLength={4}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
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
                name="ownerInformation.ownershipPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ownership Percentage *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter percentage"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-md font-semibold mb-4">Personal Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <FormField
            control={form.control}
            name="ownerInformation.personalAddress.line1"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address Line 1 *</FormLabel>
                <FormControl>
                  <GooglePlacesAutocomplete
                    placeholder="Enter personal address"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    onAddressSelect={(addressComponents) => {
                      form.setValue('ownerInformation.personalAddress.line1', addressComponents.streetAddress);
                      form.setValue('ownerInformation.personalAddress.city', addressComponents.city);  
                      form.setValue('ownerInformation.personalAddress.state', addressComponents.state);
                      form.setValue('ownerInformation.personalAddress.zipCode', addressComponents.zipCode);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ownerInformation.personalAddress.line2"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input placeholder="Apt, suite, unit, etc. (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ownerInformation.personalAddress.city"
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
            name="ownerInformation.personalAddress.state"
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
            name="ownerInformation.personalAddress.zipCode"
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
            name="ownerInformation.personalAddress.country"
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