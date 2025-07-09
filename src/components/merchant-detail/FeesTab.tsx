import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Save, Edit2, X, Plus } from 'lucide-react';
import { useMerchants } from '@/hooks/useMerchants';

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
  sync_status: string;
  basis_points?: number;
  fixed_fee?: number;
  ach_basis_points?: number;
  ach_fixed_fee?: number;
  dispute_fixed_fee?: number;
  dispute_inquiry_fixed_fee?: number;
  ach_credit_return_fixed_fee?: number;
  ach_debit_return_fixed_fee?: number;
  charge_interchange?: boolean;
  rounding_mode?: string;
  last_synced_at?: string;
}

interface FeeFormData {
  basis_points?: number;
  fixed_fee?: number;
  ach_basis_points?: number;
  ach_fixed_fee?: number;
  dispute_fixed_fee?: number;
  dispute_inquiry_fixed_fee?: number;
  ach_credit_return_fixed_fee?: number;
  ach_debit_return_fixed_fee?: number;
  charge_interchange?: boolean;
  rounding_mode?: string;
}

const FeesTab: React.FC<FeesTabProps> = ({ merchant }) => {
  const { fetchFeeProfile, createFeeProfile, updateFeeProfile, isLoading } = useMerchants();
  const [feeProfile, setFeeProfile] = useState<FeeProfile | null>(null);
  const [formData, setFormData] = useState<FeeFormData>({
    basis_points: 0,
    fixed_fee: 0,
    ach_basis_points: 0,
    ach_fixed_fee: 0,
    dispute_fixed_fee: 0,
    dispute_inquiry_fixed_fee: 0,
    ach_credit_return_fixed_fee: 0,
    ach_debit_return_fixed_fee: 0,
    charge_interchange: false,
    rounding_mode: 'TRANSACTION'
  });
  const [originalFormData, setOriginalFormData] = useState<FeeFormData>({});
  const [hasProfile, setHasProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadFeeProfile();
  }, [merchant.id]);

  const loadFeeProfile = async () => {
    const result = await fetchFeeProfile(merchant.id);
    if (result?.success && result?.profile) {
      setFeeProfile(result.profile);
      const profileData = {
        basis_points: result.profile.basis_points || 0,
        fixed_fee: result.profile.fixed_fee || 0,
        ach_basis_points: result.profile.ach_basis_points || 0,
        ach_fixed_fee: result.profile.ach_fixed_fee || 0,
        dispute_fixed_fee: result.profile.dispute_fixed_fee || 0,
        dispute_inquiry_fixed_fee: result.profile.dispute_inquiry_fixed_fee || 0,
        ach_credit_return_fixed_fee: result.profile.ach_credit_return_fixed_fee || 0,
        ach_debit_return_fixed_fee: result.profile.ach_debit_return_fixed_fee || 0,
        charge_interchange: result.profile.charge_interchange || false,
        rounding_mode: result.profile.rounding_mode || 'TRANSACTION'
      };
      setFormData(profileData);
      setOriginalFormData(profileData);
      setHasProfile(true);
    } else {
      setHasProfile(false);
    }
  };

  const handleSync = async () => {
    await loadFeeProfile();
  };

  const handleCreate = async () => {
    setIsUpdating(true);
    const result = await createFeeProfile(merchant.id, formData);
    if (result?.success) {
      await loadFeeProfile();
    }
    setIsUpdating(false);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const result = await updateFeeProfile(merchant.id, formData);
    if (result?.success) {
      await loadFeeProfile();
      setIsEditing(false);
    }
    setIsUpdating(false);
  };

  const handleCancel = () => {
    setFormData(originalFormData);
    setIsEditing(false);
  };

  const getSyncStatusBadge = () => {
    if (!feeProfile) return null;
    
    const statusConfig = {
      synced: { label: 'Synced', variant: 'default' as const },
      pending: { label: 'Pending', variant: 'secondary' as const },
      error: { label: 'Error', variant: 'destructive' as const },
    };
    
    const config = statusConfig[feeProfile.sync_status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatBasisPoints = (bps: number) => {
    return `${(bps / 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Fee Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Fee Profile</CardTitle>
            {getSyncStatusBadge()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isLoading || isEditing}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            {!hasProfile && (
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Fee Profile
              </Button>
            )}
            {hasProfile && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Update Fee Profile
              </Button>
            )}
            {hasProfile && isEditing && (
              <>
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasProfile ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-lg font-medium mb-2">No Fee Profile Found</p>
              <p>Click "Create Fee Profile" to set up fee configuration for {merchant.merchant_name}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Fee Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Fee Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basis_points">Basis Points (%)</Label>
                      {isEditing ? (
                        <Input
                          id="basis_points"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.basis_points || ''}
                          onChange={(e) => setFormData({...formData, basis_points: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatBasisPoints(feeProfile?.basis_points || 0)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fixed_fee">Fixed Fee (cents)</Label>
                      {isEditing ? (
                        <Input
                          id="fixed_fee"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.fixed_fee || ''}
                          onChange={(e) => setFormData({...formData, fixed_fee: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatCurrency(feeProfile?.fixed_fee || 0)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ACH Fee Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ACH Fee Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ach_basis_points">ACH Basis Points (%)</Label>
                      {isEditing ? (
                        <Input
                          id="ach_basis_points"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.ach_basis_points || ''}
                          onChange={(e) => setFormData({...formData, ach_basis_points: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatBasisPoints(feeProfile?.ach_basis_points || 0)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ach_fixed_fee">ACH Fixed Fee (cents)</Label>
                      {isEditing ? (
                        <Input
                          id="ach_fixed_fee"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.ach_fixed_fee || ''}
                          onChange={(e) => setFormData({...formData, ach_fixed_fee: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatCurrency(feeProfile?.ach_fixed_fee || 0)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ach_credit_return_fixed_fee">ACH Credit Return Fee (cents)</Label>
                      {isEditing ? (
                        <Input
                          id="ach_credit_return_fixed_fee"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.ach_credit_return_fixed_fee || ''}
                          onChange={(e) => setFormData({...formData, ach_credit_return_fixed_fee: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatCurrency(feeProfile?.ach_credit_return_fixed_fee || 0)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ach_debit_return_fixed_fee">ACH Debit Return Fee (cents)</Label>
                      {isEditing ? (
                        <Input
                          id="ach_debit_return_fixed_fee"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.ach_debit_return_fixed_fee || ''}
                          onChange={(e) => setFormData({...formData, ach_debit_return_fixed_fee: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatCurrency(feeProfile?.ach_debit_return_fixed_fee || 0)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dispute Fee Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dispute Fee Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dispute_fixed_fee">Dispute Fixed Fee (cents)</Label>
                      {isEditing ? (
                        <Input
                          id="dispute_fixed_fee"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.dispute_fixed_fee || ''}
                          onChange={(e) => setFormData({...formData, dispute_fixed_fee: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatCurrency(feeProfile?.dispute_fixed_fee || 0)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispute_inquiry_fixed_fee">Dispute Inquiry Fee (cents)</Label>
                      {isEditing ? (
                        <Input
                          id="dispute_inquiry_fixed_fee"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.dispute_inquiry_fixed_fee || ''}
                          onChange={(e) => setFormData({...formData, dispute_inquiry_fixed_fee: parseInt(e.target.value) || 0})}
                        />
                      ) : (
                        <p className="text-sm">{formatCurrency(feeProfile?.dispute_inquiry_fixed_fee || 0)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeesTab;