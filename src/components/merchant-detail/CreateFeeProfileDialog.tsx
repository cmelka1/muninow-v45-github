import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Merchant {
  id: string;
  merchant_name: string;
}

interface CreateFeeProfileDialogProps {
  merchant: Merchant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  ach_basis_points: string;
  ach_fixed_fee: string;
  basis_points: string;
  fixed_fee: string;
  dispute_fixed_fee: string;
  dispute_inquiry_fixed_fee: string;
}

const CreateFeeProfileDialog: React.FC<CreateFeeProfileDialogProps> = ({
  merchant,
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    ach_basis_points: "20",
    ach_fixed_fee: "30",
    basis_points: "290",
    fixed_fee: "30",
    dispute_fixed_fee: "1500",
    dispute_inquiry_fixed_fee: "1500",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        newErrors[key as keyof FormData] = 'Must be a valid number >= 0';
      }
      
      // Specific validations
      if ((key === 'ach_basis_points' || key === 'basis_points') && numValue > 10000) {
        newErrors[key as keyof FormData] = 'Must be <= 10000';
      }
      if (key !== 'ach_basis_points' && key !== 'basis_points' && numValue > 100000) {
        newErrors[key as keyof FormData] = 'Must be <= 100000';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      // Convert strings to numbers for submission
      const submitData = {
        merchantId: merchant.id,
        ach_basis_points: Number(formData.ach_basis_points),
        ach_fixed_fee: Number(formData.ach_fixed_fee),
        basis_points: Number(formData.basis_points),
        fixed_fee: Number(formData.fixed_fee),
        dispute_fixed_fee: Number(formData.dispute_fixed_fee),
        dispute_inquiry_fixed_fee: Number(formData.dispute_inquiry_fixed_fee),
      };

      const { data: result, error } = await supabase.functions.invoke(
        'create-merchant-fee-profile',
        { body: submitData }
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

      onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Fee Profile for {merchant.merchant_name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basis_points">Card Basis Points</Label>
              <Input
                id="basis_points"
                type="text"
                inputMode="numeric"
                placeholder="290"
                value={formData.basis_points}
                onChange={(e) => handleInputChange('basis_points', e.target.value)}
              />
              {errors.basis_points && (
                <p className="text-sm text-destructive mt-1">{errors.basis_points}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="fixed_fee">Card Fixed Fee (cents)</Label>
              <Input
                id="fixed_fee"
                type="text"
                inputMode="numeric"
                placeholder="30"
                value={formData.fixed_fee}
                onChange={(e) => handleInputChange('fixed_fee', e.target.value)}
              />
              {errors.fixed_fee && (
                <p className="text-sm text-destructive mt-1">{errors.fixed_fee}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ach_basis_points">ACH Basis Points</Label>
              <Input
                id="ach_basis_points"
                type="text"
                inputMode="numeric"
                placeholder="20"
                value={formData.ach_basis_points}
                onChange={(e) => handleInputChange('ach_basis_points', e.target.value)}
              />
              {errors.ach_basis_points && (
                <p className="text-sm text-destructive mt-1">{errors.ach_basis_points}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ach_fixed_fee">ACH Fixed Fee (cents)</Label>
              <Input
                id="ach_fixed_fee"
                type="text"
                inputMode="numeric"
                placeholder="30"
                value={formData.ach_fixed_fee}
                onChange={(e) => handleInputChange('ach_fixed_fee', e.target.value)}
              />
              {errors.ach_fixed_fee && (
                <p className="text-sm text-destructive mt-1">{errors.ach_fixed_fee}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dispute_fixed_fee">Dispute Fixed Fee (cents)</Label>
              <Input
                id="dispute_fixed_fee"
                type="text"
                inputMode="numeric"
                placeholder="1500"
                value={formData.dispute_fixed_fee}
                onChange={(e) => handleInputChange('dispute_fixed_fee', e.target.value)}
              />
              {errors.dispute_fixed_fee && (
                <p className="text-sm text-destructive mt-1">{errors.dispute_fixed_fee}</p>
              )}
            </div>

            <div>
              <Label htmlFor="dispute_inquiry_fixed_fee">Dispute Inquiry Fee (cents)</Label>
              <Input
                id="dispute_inquiry_fixed_fee"
                type="text"
                inputMode="numeric"
                placeholder="1500"
                value={formData.dispute_inquiry_fixed_fee}
                onChange={(e) => handleInputChange('dispute_inquiry_fixed_fee', e.target.value)}
              />
              {errors.dispute_inquiry_fixed_fee && (
                <p className="text-sm text-destructive mt-1">{errors.dispute_inquiry_fixed_fee}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Fee Profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFeeProfileDialog;