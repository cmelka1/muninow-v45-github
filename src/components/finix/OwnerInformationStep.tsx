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
                    <FormLabel>Personal Tax ID (SSN) *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="9 digits"
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
                        className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
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