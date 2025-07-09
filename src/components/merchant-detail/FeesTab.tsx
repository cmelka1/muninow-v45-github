import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Plus, Edit } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CreateFeeProfileDialog from './CreateFeeProfileDialog';
import EditFeeProfileDialog from './EditFeeProfileDialog';

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

const FeesTab: React.FC<FeesTabProps> = ({ merchant }) => {
  const { hasRole, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [feeProfile, setFeeProfile] = useState<FeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isSuperAdmin = hasRole('superAdmin');

  useEffect(() => {
    fetchFeeProfile();
  }, [merchant.id, roleLoading, isSuperAdmin]);

  const fetchFeeProfile = async () => {
    // Wait for role loading to complete before making access decisions
    if (roleLoading) {
      return;
    }
    
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
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    fetchFeeProfile();
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    fetchFeeProfile();
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

  return (
    <>
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Fee Profile
            </CardTitle>
            {!feeProfile ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Fee Profile
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!feeProfile ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No Fee Profile</p>
              <p>Create a fee profile to configure payment processing fees for {merchant.merchant_name}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-slate-700">
                  Status: {feeProfile.sync_status === 'synced' ? 'Synced with Finix' : feeProfile.sync_status}
                </span>
              </div>

              {/* Fee Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card Basis Points */}
                <div className="space-y-2">
                  <label className="text-slate-700 font-medium">Card Basis Points</label>
                  <div className="text-slate-900 font-semibold">
                    {feeProfile.basis_points || 0} bp
                  </div>
                </div>

                {/* Card Fixed Fee */}
                <div className="space-y-2">
                  <label className="text-slate-700 font-medium">Card Fixed Fee</label>
                  <div className="text-slate-900 font-semibold">
                    ${((feeProfile.fixed_fee || 0) / 100).toFixed(2)}
                  </div>
                </div>

                {/* ACH Basis Points */}
                <div className="space-y-2">
                  <label className="text-slate-700 font-medium">ACH Basis Points</label>
                  <div className="text-slate-900 font-semibold">
                    {feeProfile.ach_basis_points || 0} bp
                  </div>
                </div>

                {/* ACH Fixed Fee */}
                <div className="space-y-2">
                  <label className="text-slate-700 font-medium">ACH Fixed Fee</label>
                  <div className="text-slate-900 font-semibold">
                    ${((feeProfile.ach_fixed_fee || 0) / 100).toFixed(2)}
                  </div>
                </div>

                {/* Chargeback Fee */}
                <div className="space-y-2">
                  <label className="text-slate-700 font-medium">Chargeback Fee</label>
                  <div className="text-slate-900 font-semibold">
                    ${((feeProfile.dispute_fixed_fee || 0) / 100).toFixed(2)}
                  </div>
                </div>

                {/* Chargeback Inquiry */}
                <div className="space-y-2">
                  <label className="text-slate-700 font-medium">Chargeback Inquiry</label>
                  <div className="text-slate-900 font-semibold">
                    ${((feeProfile.dispute_inquiry_fixed_fee || 0) / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Profile Information */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-md font-semibold text-slate-800 mb-4">Profile Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-700 font-medium">Finix Profile ID</label>
                    <div className="text-slate-900 font-mono text-sm">
                      {feeProfile.finix_fee_profile_id || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700 font-medium">Last Synced</label>
                    <div className="text-slate-900">
                      {feeProfile.last_synced_at 
                        ? new Date(feeProfile.last_synced_at).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateFeeProfileDialog
        merchant={merchant}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />

      <EditFeeProfileDialog
        merchant={merchant}
        feeProfile={feeProfile}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default FeesTab;