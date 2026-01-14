import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus } from 'lucide-react';
import { usePermitTypes, useCreatePermitType, useUpdatePermitType, type PermitType } from '@/hooks/usePermitTypes';
import { useMerchants } from '@/hooks/useMerchants';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string()
    .min(1, 'Permit type name is required')
    .refine(val => val.trim() !== '', {
      message: 'Name cannot be empty or whitespace only'
    }),
  merchant_id: z.string().optional(),
  base_fee_cents: z.number().min(0, 'Fee must be positive'),
  processing_days: z.number().min(1, 'Processing days must be at least 1'),
  requires_inspection: z.boolean(),
  description: z.string().optional(),
  is_renewable: z.boolean().default(false),
  renewal_reminder_days: z.number().min(0).optional(),
  renewal_fee_cents: z.number().min(0).optional(),
  validity_duration_days: z.number().min(1).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MunicipalPermitTypeDialogProps {
  permitType?: PermitType;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MunicipalPermitTypeDialog: React.FC<MunicipalPermitTypeDialogProps> = ({
  permitType,
  trigger,
  open,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useAuth();
  const { data: permitTypes } = usePermitTypes(profile?.customer_id);
  const { merchants, fetchMerchantsByCustomer } = useMerchants();
  
  const createMutation = useCreatePermitType();
  const updateMutation = useUpdatePermitType();

  React.useEffect(() => {
    if (profile?.customer_id) {
      fetchMerchantsByCustomer(profile.customer_id);
    }
  }, [profile?.customer_id, fetchMerchantsByCustomer]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: permitType?.name || '',
      merchant_id: permitType?.merchant_id || '',
      base_fee_cents: permitType?.base_fee_cents ? permitType.base_fee_cents / 100 : 0,
      processing_days: permitType?.processing_days || 30,
      requires_inspection: permitType?.requires_inspection || false,
      description: permitType?.description || '',
      is_renewable: permitType?.is_renewable || false,
      renewal_reminder_days: permitType?.renewal_reminder_days || 30,
      renewal_fee_cents: permitType?.renewal_fee_cents ? permitType.renewal_fee_cents / 100 : 0,
      validity_duration_days: permitType?.validity_duration_days || 365,
    },
  });

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsOpen(newOpen);
    }
    if (!newOpen) {
      form.reset();
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        name: data.name.trim(),
        merchant_id: data.merchant_id || null,
        base_fee_cents: Math.round(data.base_fee_cents * 100),
        processing_days: data.processing_days,
        requires_inspection: data.requires_inspection,
        description: data.description || null,
        merchant_name: merchants.find(m => m.id === data.merchant_id)?.merchant_name || null,
        customer_id: profile?.customer_id,
        is_renewable: data.is_renewable,
        renewal_reminder_days: data.is_renewable ? (data.renewal_reminder_days || 30) : null,
        renewal_fee_cents: data.is_renewable && data.renewal_fee_cents ? Math.round(data.renewal_fee_cents * 100) : 0,
        validity_duration_days: data.validity_duration_days || 365,
      };

      if (permitType) {
        await updateMutation.mutateAsync({
          id: permitType.id,
          updates: payload,
        });
        toast.success('Permit type updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Permit type created successfully');
      }
      
      handleDialogOpenChange(false);
    } catch (error) {
      toast.error('Failed to save permit type');
      console.error('Error saving permit type:', error);
    }
  };

  const dialogOpen = open !== undefined ? open : isOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {permitType ? 'Edit Permit Type' : 'Add Permit Type'}
          </DialogTitle>
          <DialogDescription>
            {permitType 
              ? 'Modify the permit type settings for your municipality'
              : 'Add a new permit type or customize a standard permit type for your municipality'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permit Type Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Residential Building Permit" />
                  </FormControl>
                  <FormDescription>
                    The name residents will see when applying for this permit
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="merchant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Merchant (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select merchant for payments" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {merchants.map((merchant) => (
                        <SelectItem key={merchant.id} value={merchant.id}>
                          {merchant.merchant_name} ({merchant.subcategory})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose which merchant account will process payments for this permit type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="base_fee_cents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Fee ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="processing_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processing Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name="requires_inspection"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Requires Inspection</FormLabel>
                      <FormDescription>
                        Whether this permit type requires an inspection after approval
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="is_renewable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Allow Renewals</FormLabel>
                        <FormDescription>
                          Enable permit renewal functionality
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('is_renewable') && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <FormField
                      control={form.control}
                      name="validity_duration_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validity (Days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
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
                      name="renewal_reminder_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reminder (Days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
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
                      name="renewal_fee_cents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renewal Fee ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional information about this permit type..."
                    />
                  </FormControl>
                  <FormDescription>
                    Provide additional details or instructions for applicants
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {permitType ? 'Update' : 'Create'} Permit Type
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};