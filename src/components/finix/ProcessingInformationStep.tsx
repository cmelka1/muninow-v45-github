import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage,
  FormDescription,
  Form
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { FinixSellerFormData } from '@/schemas/finixSellerSchema';

interface ProcessingInformationStepProps {
  form: UseFormReturn<FinixSellerFormData>;
}

export function ProcessingInformationStep({ form }: ProcessingInformationStepProps) {
  const cardDistribution = form.watch('processingInformation.cardVolumeDistribution');
  const businessDistribution = form.watch('processingInformation.businessVolumeDistribution');
  
  const cardTotal = cardDistribution.cardPresent + cardDistribution.moto + cardDistribution.ecommerce;
  const businessTotal = businessDistribution.b2b + businessDistribution.b2c + businessDistribution.p2p;

  return (
    <div className="space-y-8">
      {/* Processing Volumes */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Processing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <FormField
            control={form.control}
            name="processingInformation.annualAchVolume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual ACH Volume ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.annualCardVolume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Card Volume ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.averageAchAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Average ACH Transfer Amount ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.averageCardAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Average Card Transfer Amount ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.maxAchAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum ACH Transaction Amount ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.maxCardAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Card Transaction Amount ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.mccCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MCC Code (Merchant Category Code) *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 5411"
                    maxLength={4}
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
            name="processingInformation.statementDescriptor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Statement Descriptor *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="How it appears on statements"
                    maxLength={22}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Card Volume Distribution */}
      <div>
        <h4 className="text-md font-semibold mb-4">Card Volume Distribution</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Percentages must total 100%. Current total: {cardTotal}%
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <FormField
            control={form.control}
            name="processingInformation.cardVolumeDistribution.cardPresent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Card Present (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.cardVolumeDistribution.moto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MOTO (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.cardVolumeDistribution.ecommerce"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-commerce (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {cardTotal !== 100 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Card volume distribution must total 100%
          </div>
        )}
      </div>

      {/* Business Volume Distribution */}
      <div>
        <h4 className="text-md font-semibold mb-4">Business Volume Distribution</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Percentages must total 100%. Current total: {businessTotal}%
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <FormField
            control={form.control}
            name="processingInformation.businessVolumeDistribution.b2b"
            render={({ field }) => (
              <FormItem>
                <FormLabel>B2B (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.businessVolumeDistribution.b2c"
            render={({ field }) => (
              <FormItem>
                <FormLabel>B2C (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.businessVolumeDistribution.p2p"
            render={({ field }) => (
              <FormItem>
                <FormLabel>P2P (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {businessTotal !== 100 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Business volume distribution must total 100%
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div>
        <h4 className="text-md font-semibold mb-4">Additional Information</h4>
        <div className="space-y-4">
          
          <FormField
            control={form.control}
            name="processingInformation.hasAcceptedCardsPreviously"
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processingInformation.refundPolicy"
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
                    <SelectItem value="NO_REFUNDS">No Refunds</SelectItem>
                    <SelectItem value="FULL_REFUNDS">Full Refunds</SelectItem>
                    <SelectItem value="PARTIAL_REFUNDS">Partial Refunds</SelectItem>
                    <SelectItem value="MERCHANDISE_EXCHANGE">Merchandise Exchange</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* Legal Agreements and Consent */}
      <div>
        <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Legal Agreements & Consent
        </h4>
        
        <div className="space-y-6 bg-muted/30 p-6 rounded-lg">
          
          {/* Identity Verification Notice */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Identity Verification</p>
                <p className="text-sm text-muted-foreground">
                  The information you provide will be used to verify your identity. Additional information may be requested.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Terms Agreement */}
          <div className="space-y-4">
            <div className="text-sm">
              <p className="mb-2">
                By continuing, you agree to our{' '}
                <a 
                  href="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Terms of Service
                  <ExternalLink className="w-3 h-3" />
                </a>
                {' '}and the{' '}
                <a 
                  href="https://finix-hosted-content.s3.amazonaws.com/flex/v3/finix-terms-of-service.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Finix Terms of Service
                  <ExternalLink className="w-3 h-3" />
                </a>
                .
              </p>
            </div>

            <FormField
              control={form.control}
              name="processingInformation.merchantAgreementAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      required
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      I accept the Merchant Agreement *
                    </FormLabel>
                    <FormDescription>
                      This is required to process your application.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Optional Credit Check Consent */}
          <div>
            <FormField
              control={form.control}
              name="processingInformation.creditCheckConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Credit Check Consent (Optional)
                    </FormLabel>
                    <FormDescription>
                      I consent to Finix performing a credit check to verify my identity and creditworthiness.
                      This may help expedite the approval process.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}