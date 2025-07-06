import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { BankAccountFormData } from '@/schemas/merchantAccountSchema';

interface BankAccountStepProps {
  businessName: string;
  finixIdentityId: string;
}

const BankAccountStep: React.FC<BankAccountStepProps> = ({ 
  businessName, 
  finixIdentityId 
}) => {
  const form = useFormContext<{ bankAccount: BankAccountFormData }>();

  return (
    <div className="space-y-6">
      {/* Customer Information Header */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-500">Business Name</Label>
            <p className="text-sm text-gray-900 mt-1">{businessName}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500">Finix Identity ID</Label>
            <p className="text-sm text-gray-900 mt-1">{finixIdentityId}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="bankAccount.nameOnAccount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name on Account *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter the name as it appears on the bank account"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankAccount.accountNickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Nickname (For MuniNow purposes)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Optional nickname for internal use"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankAccount.routingNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Routing Number *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="9-digit ABA routing number"
                    maxLength={9}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankAccount.accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Full bank account number"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankAccount.accountNumberConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Account Number *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Re-enter account number to confirm"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <Label className="text-sm font-medium text-gray-500">Account Type</Label>
            <p className="text-sm text-gray-900 mt-1">Business Checking</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccountStep;