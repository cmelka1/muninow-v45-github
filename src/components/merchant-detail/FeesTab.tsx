import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Plus, Edit } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Merchant {
  id: string;
  merchant_name: string;
}

interface FeesTabProps {
  merchant: Merchant;
}

interface FeeProfile {
  id: string;
  merchant_id: string;
  finix_fee_profile_id: string | null;
  ach_basis_points: number | null;
  ach_fixed_fee: number | null;
  basis_points: number | null;
  fixed_fee: number | null;
  dispute_fixed_fee: number | null;
  dispute_inquiry_fixed_fee: number | null;
  sync_status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FeeProfileFormData {
  ach_basis_points: number;
  ach_fixed_fee: number;
  basis_points: number;
  fixed_fee: number;
  dispute_fixed_fee: number;
  dispute_inquiry_fixed_fee: number;
}

const FeesTab: React.FC<FeesTabProps> = ({ merchant }) => {
  const { hasRole } = useUserRole();
  const { toast } = useToast();
  const [feeProfile, setFeeProfile] = useState<FeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const form = useForm<FeeProfileFormData>({
    defaultValues: {
      ach_basis_points: 20,
      ach_fixed_fee: 30,
      basis_points: 290,
      fixed_fee: 30,
      dispute_fixed_fee: 1500,
      dispute_inquiry_fixed_fee: 1500,
    }
  });

  const isSuperAdmin = hasRole('superAdmin');

  useEffect(() => {
    fetchFeeProfile();
  }, [merchant.id]);

  const fetchFeeProfile = async () => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('merchant_fee_profiles')
        .select('*')
        .eq('merchant_id', merchant.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching fee profile:', error);
        toast({
          title: "Error",
          description: "Failed to fetch fee profile",
          variant: "destructive",
        });
      } else {
        setFeeProfile(data);
        if (data) {
          // Update form with existing data
          form.reset({
            ach_basis_points: data.ach_basis_points || 0,
            ach_fixed_fee: data.ach_fixed_fee || 0,
            basis_points: data.basis_points || 0,
            fixed_fee: data.fixed_fee || 0,
            dispute_fixed_fee: data.dispute_fixed_fee || 0,
            dispute_inquiry_fixed_fee: data.dispute_inquiry_fixed_fee || 0,
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateSubmit = async (data: FeeProfileFormData) => {
    setIsCreating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        'create-merchant-fee-profile',
        {
          body: {
            merchantId: merchant.id,
            ...data
          }
        }
      );

      if (error) {
        throw error;
      }

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: "Fee profile created successfully",
      });

      setShowCreateDialog(false);
      await fetchFeeProfile();
    } catch (error: any) {
      console.error('Error creating fee profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create fee profile",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const onUpdateSubmit = async (data: FeeProfileFormData) => {
    setIsUpdating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        'update-merchant-fee-profile',
        {
          body: {
            merchantId: merchant.id,
            ...data
          }
        }
      );

      if (error) {
        throw error;
      }

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: "Fee profile updated successfully",
      });

      setShowEditDialog(false);
      await fetchFeeProfile();
    } catch (error: any) {
      console.error('Error updating fee profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update fee profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fees</CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading fee profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fees</CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access restricted. Only SuperAdmin users can manage fee profiles.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const FeeProfileForm = ({ onSubmit, isSubmitting, submitText }: {
    onSubmit: (data: FeeProfileFormData) => void;
    isSubmitting: boolean;
    submitText: string;
  }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="basis_points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Basis Points (Card)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="290"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fixed_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fixed Fee (Card) - Cents</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ach_basis_points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ACH Basis Points</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="20"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ach_fixed_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ACH Fixed Fee - Cents</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dispute_fixed_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dispute Fixed Fee - Cents</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1500"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dispute_inquiry_fixed_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dispute Inquiry Fee - Cents</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1500"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitText}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Fee Profile</CardTitle>
        {!feeProfile ? (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Fee Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Fee Profile for {merchant.merchant_name}</DialogTitle>
              </DialogHeader>
              <FeeProfileForm
                onSubmit={onCreateSubmit}
                isSubmitting={isCreating}
                submitText="Create Fee Profile"
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Fee Profile for {merchant.merchant_name}</DialogTitle>
              </DialogHeader>
              <FeeProfileForm
                onSubmit={onUpdateSubmit}
                isSubmitting={isUpdating}
                submitText="Update Fee Profile"
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {!feeProfile ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No Fee Profile</p>
            <p>Create a fee profile to configure payment processing fees for {merchant.merchant_name}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">
                Status: {feeProfile.sync_status === 'synced' ? 'Synced with Finix' : feeProfile.sync_status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Card Processing Fees</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Basis Points:</span>
                    <span className="text-sm font-medium">{feeProfile.basis_points || 0} bp</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fixed Fee:</span>
                    <span className="text-sm font-medium">${((feeProfile.fixed_fee || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">ACH Processing Fees</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Basis Points:</span>
                    <span className="text-sm font-medium">{feeProfile.ach_basis_points || 0} bp</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fixed Fee:</span>
                    <span className="text-sm font-medium">${((feeProfile.ach_fixed_fee || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dispute Fees</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Dispute Fee:</span>
                    <span className="text-sm font-medium">${((feeProfile.dispute_fixed_fee || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Inquiry Fee:</span>
                    <span className="text-sm font-medium">${((feeProfile.dispute_inquiry_fixed_fee || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Profile Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Finix Profile ID:</span>
                    <span className="text-sm font-mono">{feeProfile.finix_fee_profile_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Synced:</span>
                    <span className="text-sm">
                      {feeProfile.last_synced_at 
                        ? new Date(feeProfile.last_synced_at).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeesTab;