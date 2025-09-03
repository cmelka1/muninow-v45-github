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
import { usePermitTypes } from '@/hooks/usePermitTypes';
import { useMerchants } from '@/hooks/useMerchants';
import { useCreateMunicipalPermitType, useUpdateMunicipalPermitType, type MunicipalPermitType } from '@/hooks/useMunicipalPermitTypes';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';

const formSchema = z.object({
  permit_type_id: z.string().optional(),
  merchant_id: z.string().optional(),
  municipal_label: z.string().min(1, 'Municipal label is required'),
  base_fee_cents: z.number().min(0, 'Fee must be positive'),
  processing_days: z.number().min(1, 'Processing days must be at least 1'),
  requires_inspection: z.boolean(),
  is_custom: z.boolean(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MunicipalPermitTypeDialogProps {
  permitType?: MunicipalPermitType;
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
  const { data: standardPermitTypes } = usePermitTypes();
  const { merchants, fetchMerchantsByCustomer } = useMerchants();
  
  const createMutation = useCreateMunicipalPermitType();
  const updateMutation = useUpdateMunicipalPermitType();

  React.useEffect(() => {
    if (profile?.customer_id) {
      fetchMerchantsByCustomer(profile.customer_id);
    }
  }, [profile?.customer_id, fetchMerchantsByCustomer]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      permit_type_id: permitType?.permit_type_id || '',
      merchant_id: permitType?.merchant_id || '',
      municipal_label: permitType?.municipal_label || '',
      base_fee_cents: permitType?.base_fee_cents ? permitType.base_fee_cents / 100 : 0,
      processing_days: permitType?.processing_days || 30,
      requires_inspection: permitType?.requires_inspection || false,
      is_custom: permitType?.is_custom || false,
      description: permitType?.description || '',
    },
  });

  const selectedPermitType = form.watch('permit_type_id');
  const isCustom = form.watch('is_custom');

  React.useEffect(() => {
    if (selectedPermitType && standardPermitTypes) {
      const standard = standardPermitTypes.find(pt => pt.id === selectedPermitType);
      if (standard) {
        form.setValue('municipal_label', standard.name);
        form.setValue('base_fee_cents', standard.base_fee_cents / 100);
        form.setValue('processing_days', standard.processing_days);
        form.setValue('requires_inspection', standard.requires_inspection);
      }
    }
  }, [selectedPermitType, standardPermitTypes, form]);

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
        permit_type_id: data.permit_type_id,
        merchant_id: data.merchant_id,
        municipal_label: data.municipal_label,
        base_fee_cents: Math.round(data.base_fee_cents * 100),
        processing_days: data.processing_days,
        requires_inspection: data.requires_inspection,
        is_custom: data.is_custom,
        description: data.description,
        merchant_name: merchants.find(m => m.id === data.merchant_id)?.merchant_name || null,
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
              name="is_custom"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Custom Permit Type</FormLabel>
                    <FormDescription>
                      Create a completely custom permit type instead of customizing a standard one
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isCustom && (
              <FormField
                control={form.control}
                name="permit_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard Permit Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a standard permit type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {standardPermitTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a standard permit type to customize for your municipality
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="merchant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Merchant</FormLabel>
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

            <FormField
              control={form.control}
              name="municipal_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Municipal Label</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Building Permit - Residential" />
                  </FormControl>
                  <FormDescription>
                    The name residents will see when applying for this permit
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