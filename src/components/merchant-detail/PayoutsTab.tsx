import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Save, Edit2, X } from 'lucide-react';
import { useMerchants } from '@/hooks/useMerchants';
import { PayoutProfile, PayoutProfileFormData, PayoutType, PayoutFrequency, PayoutRail } from '@/types/payoutProfile';

interface Merchant {
  id: string;
  merchant_name: string;
  bank_account_holder_name: string | null;
  bank_masked_account_number: string | null;
  bank_routing_number: string | null;
}

interface PayoutsTabProps {
  merchant: Merchant;
}

const PayoutsTab: React.FC<PayoutsTabProps> = ({ merchant }) => {
  const { fetchPayoutProfile, updatePayoutProfile, isLoading } = useMerchants();
  const [payoutProfile, setPayoutProfile] = useState<PayoutProfile | null>(null);
  const [formData, setFormData] = useState<PayoutProfileFormData>({
    type: 'GROSS'
  });
  const [originalFormData, setOriginalFormData] = useState<PayoutProfileFormData>({
    type: 'GROSS'
  });
  const [hasProfile, setHasProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadPayoutProfile();
  }, [merchant.id]);

  const loadPayoutProfile = async () => {
    const result = await fetchPayoutProfile(merchant.id);
    if (result?.success && result?.profile) {
      setPayoutProfile(result.profile);
      const profileData = {
        type: result.profile.type,
        net_frequency: result.profile.net_frequency,
        net_submission_delay_days: result.profile.net_submission_delay_days,
        net_payment_instrument_id: result.profile.net_payment_instrument_id,
        net_rail: result.profile.net_rail,
        gross_payouts_frequency: result.profile.gross_payouts_frequency,
        gross_payouts_submission_delay_days: result.profile.gross_payouts_submission_delay_days,
        gross_payouts_payment_instrument_id: result.profile.gross_payouts_payment_instrument_id,
        gross_payouts_rail: result.profile.gross_payouts_rail,
        gross_fees_frequency: result.profile.gross_fees_frequency,
        gross_fees_submission_delay_days: result.profile.gross_fees_submission_delay_days,
        gross_fees_payment_instrument_id: result.profile.gross_fees_payment_instrument_id,
        gross_fees_rail: result.profile.gross_fees_rail,
      };
      setFormData(profileData);
      setOriginalFormData(profileData);
      setHasProfile(true);
    }
  };

  const handleSync = async () => {
    await loadPayoutProfile();
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const result = await updatePayoutProfile(merchant.id, formData);
    if (result?.success) {
      setPayoutProfile(result.profile);
      setOriginalFormData(formData);
      setIsEditing(false);
    }
    setIsUpdating(false);
  };

  const handleCancel = () => {
    setFormData(originalFormData);
    setIsEditing(false);
  };

  const handleTypeChange = (type: PayoutType) => {
    if (!isEditing) return;
    setFormData({ ...formData, type });
  };

  const getSyncStatusBadge = () => {
    if (!payoutProfile) return null;
    
    const statusConfig = {
      synced: { label: 'Synced', variant: 'default' as const },
      pending: { label: 'Pending', variant: 'secondary' as const },
      error: { label: 'Error', variant: 'destructive' as const },
    };
    
    const config = statusConfig[payoutProfile.sync_status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Bank Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bank Account Name</label>
              <p className="mt-1 text-sm text-foreground">
                {merchant.bank_account_holder_name || 'Not Available'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bank Account Number</label>
              <p className="mt-1 text-sm text-foreground">
                {merchant.bank_masked_account_number || 'Not Available'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Routing Number</label>
              <p className="mt-1 text-sm text-foreground">
                {merchant.bank_routing_number || 'Not Available'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Payout Profile</CardTitle>
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
              {hasProfile ? 'Refresh' : 'Sync from Finix'}
            </Button>
            {hasProfile && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
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
              <p className="text-lg font-medium mb-2">No Payout Profile Found</p>
              <p>Click "Sync from Finix" to fetch the payout profile for {merchant.merchant_name}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Type Selection */}
              <div className="space-y-3">
                <Label>Payout Type</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={handleTypeChange}
                  className="flex gap-6"
                  disabled={!isEditing}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="GROSS" id="gross" disabled={!isEditing} />
                    <Label htmlFor="gross">GROSS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="NET" id="net" disabled={!isEditing} />
                    <Label htmlFor="net">NET</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* NET Type Form */}
              {formData.type === 'NET' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">NET Payout Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="net_frequency">Frequency</Label>
                        <Select 
                          value={formData.net_frequency} 
                          onValueChange={(value: PayoutFrequency) => 
                            isEditing && setFormData({...formData, net_frequency: value})
                          }
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="CONTINUOUS">Continuous</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="net_rail">Rail</Label>
                        <Select 
                          value={formData.net_rail} 
                          onValueChange={(value: PayoutRail) => 
                            isEditing && setFormData({...formData, net_rail: value})
                          }
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select rail" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEXT_DAY_ACH">Next Day ACH</SelectItem>
                            <SelectItem value="SAME_DAY_ACH">Same Day ACH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="net_submission_delay_days">Submission Delay Days</Label>
                        <Input
                          id="net_submission_delay_days"
                          type="number"
                          min="0"
                          value={formData.net_submission_delay_days || ''}
                          onChange={(e) => isEditing && setFormData({...formData, net_submission_delay_days: parseInt(e.target.value) || 0})}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="net_payment_instrument_id">Payment Instrument ID</Label>
                        <Input
                          id="net_payment_instrument_id"
                          value={formData.net_payment_instrument_id || ''}
                          onChange={(e) => isEditing && setFormData({...formData, net_payment_instrument_id: e.target.value})}
                          placeholder="Enter payment instrument ID"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* GROSS Type Form */}
              {formData.type === 'GROSS' && (
                <div className="space-y-6">
                  {/* Payouts Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payouts Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gross_payouts_frequency">Frequency</Label>
                          <Select 
                            value={formData.gross_payouts_frequency} 
                            onValueChange={(value: PayoutFrequency) => 
                              isEditing && setFormData({...formData, gross_payouts_frequency: value})
                            }
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                              <SelectItem value="CONTINUOUS">Continuous</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gross_payouts_rail">Rail</Label>
                          <Select 
                            value={formData.gross_payouts_rail} 
                            onValueChange={(value: PayoutRail) => 
                              isEditing && setFormData({...formData, gross_payouts_rail: value})
                            }
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select rail" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NEXT_DAY_ACH">Next Day ACH</SelectItem>
                              <SelectItem value="SAME_DAY_ACH">Same Day ACH</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gross_payouts_submission_delay_days">Submission Delay Days</Label>
                          <Input
                            id="gross_payouts_submission_delay_days"
                            type="number"
                            min="0"
                            value={formData.gross_payouts_submission_delay_days || ''}
                            onChange={(e) => isEditing && setFormData({...formData, gross_payouts_submission_delay_days: parseInt(e.target.value) || 0})}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gross_payouts_payment_instrument_id">Payment Instrument ID</Label>
                          <Input
                            id="gross_payouts_payment_instrument_id"
                            value={formData.gross_payouts_payment_instrument_id || ''}
                            onChange={(e) => isEditing && setFormData({...formData, gross_payouts_payment_instrument_id: e.target.value})}
                            placeholder="Enter payment instrument ID"
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fees Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Fees Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gross_fees_frequency">Frequency</Label>
                          <Select 
                            value={formData.gross_fees_frequency} 
                            onValueChange={(value: PayoutFrequency) => 
                              isEditing && setFormData({...formData, gross_fees_frequency: value})
                            }
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                              <SelectItem value="CONTINUOUS">Continuous</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gross_fees_rail">Rail</Label>
                          <Select 
                            value={formData.gross_fees_rail} 
                            onValueChange={(value: PayoutRail) => 
                              isEditing && setFormData({...formData, gross_fees_rail: value})
                            }
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select rail" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NEXT_DAY_ACH">Next Day ACH</SelectItem>
                              <SelectItem value="SAME_DAY_ACH">Same Day ACH</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gross_fees_submission_delay_days">Submission Delay Days</Label>
                          <Input
                            id="gross_fees_submission_delay_days"
                            type="number"
                            min="0"
                            value={formData.gross_fees_submission_delay_days || ''}
                            onChange={(e) => isEditing && setFormData({...formData, gross_fees_submission_delay_days: parseInt(e.target.value) || 0})}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gross_fees_payment_instrument_id">Payment Instrument ID</Label>
                          <Input
                            id="gross_fees_payment_instrument_id"
                            value={formData.gross_fees_payment_instrument_id || ''}
                            onChange={(e) => isEditing && setFormData({...formData, gross_fees_payment_instrument_id: e.target.value})}
                            placeholder="Enter payment instrument ID"
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutsTab;