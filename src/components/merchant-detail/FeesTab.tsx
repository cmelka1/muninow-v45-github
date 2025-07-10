import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import FeeProfileCreateForm from './FeeProfileCreateForm';
import FeeProfileConfirmForm from './FeeProfileConfirmForm';
import FeeProfileDisplay from './FeeProfileDisplay';
import { useToast } from '@/hooks/use-toast';

interface Merchant {
  id: string;
  merchant_name: string;
  finix_merchant_id: string;
  finix_merchant_profile_id: string;
}

interface FeeProfile {
  id: string;
  merchant_id: string;
  finix_fee_profile_id: string;
  ach_basis_points: number;
  ach_basis_points_fee_limit?: number;
  ach_fixed_fee: number;
  basis_points: number;
  fixed_fee: number;
  ach_credit_return_fixed_fee: number;
  ach_debit_return_fixed_fee: number;
  dispute_fixed_fee: number;
  dispute_inquiry_fixed_fee: number;
  sync_status: string;
  created_at: string;
}

interface FeeFormData {
  ach_basis_points: number;
  ach_basis_points_fee_limit?: number;
  ach_fixed_fee: number;
  basis_points: number;
  fixed_fee: number;
  ach_credit_return_fixed_fee: number;
  ach_debit_return_fixed_fee: number;
  dispute_fixed_fee: number;
  dispute_inquiry_fixed_fee: number;
}

interface FeesTabProps {
  merchant: Merchant;
}

type ViewState = 'display' | 'create' | 'confirm';

const FeesTab: React.FC<FeesTabProps> = ({ merchant }) => {
  const [feeProfile, setFeeProfile] = useState<FeeProfile | null>(null);
  const [viewState, setViewState] = useState<ViewState>('display');
  const [formData, setFormData] = useState<FeeFormData | null>(null);
  const [tempFeeProfileId, setTempFeeProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFeeProfile();
  }, [merchant.id]);

  const loadFeeProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_fee_profiles')
        .select('*')
        .eq('merchant_id', merchant.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading fee profile:', error);
        toast({
          title: "Error",
          description: "Failed to load fee profile",
          variant: "destructive",
        });
      } else if (data) {
        setFeeProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error loading fee profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStart = () => {
    setViewState('create');
  };

  const handleCreateSubmit = async (data: FeeFormData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-merchant-fee-profile', {
        body: {
          merchantId: merchant.id,
          ...data
        }
      });

      if (error) {
        throw error;
      }

      if (result?.success) {
        setFormData(data);
        setTempFeeProfileId(result.feeProfile.id);
        setViewState('confirm');
        toast({
          title: "Success",
          description: "Fee profile created successfully",
        });
      } else {
        throw new Error(result?.error || 'Failed to create fee profile');
      }
    } catch (error) {
      console.error('Error creating fee profile:', error);
      toast({
        title: "Error",
        description: "Failed to create fee profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!tempFeeProfileId) return;
    
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('confirm-merchant-fee-profile', {
        body: {
          feeProfileId: tempFeeProfileId
        }
      });

      if (error) {
        throw error;
      }

      if (result?.success) {
        setFeeProfile(result.feeProfile);
        setViewState('display');
        setFormData(null);
        setTempFeeProfileId(null);
        toast({
          title: "Success",
          description: "Fee profile confirmed and applied to merchant",
        });
      } else {
        throw new Error(result?.error || 'Failed to confirm fee profile');
      }
    } catch (error) {
      console.error('Error confirming fee profile:', error);
      toast({
        title: "Error",
        description: "Failed to confirm fee profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setViewState('display');
    setFormData(null);
    setTempFeeProfileId(null);
  };

  if (isLoading && viewState === 'display') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">Loading fee profile...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewState === 'display' && (
        <>
          {feeProfile ? (
            <FeeProfileDisplay feeProfile={feeProfile} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Fee Profile</CardTitle>
              </CardHeader>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    No fee profile has been created for this merchant yet.
                  </p>
                  <Button onClick={handleCreateStart} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Fee Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {viewState === 'create' && (
        <FeeProfileCreateForm
          onSubmit={handleCreateSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}

      {viewState === 'confirm' && formData && (
        <FeeProfileConfirmForm
          merchant={merchant}
          formData={formData}
          onConfirm={handleConfirmSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default FeesTab;