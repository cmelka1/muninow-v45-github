import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Edit2, Plus, DollarSign, CreditCard, Building, Zap } from 'lucide-react';
import { useMerchants } from '@/hooks/useMerchants';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Default values for fee profile
const DEFAULT_VALUES = {
  fixed_fee_cents: 30,
  percentage_fee: 0.029,
  card_present_fixed_fee_cents: 30,
  card_present_percentage_fee: 0.029,
  card_not_present_fixed_fee_cents: 30,
  card_not_present_percentage_fee: 0.029,
  ach_debit_fixed_fee_cents: 30,
  ach_debit_percentage_fee: 0.002,
  ach_credit_fixed_fee_cents: 30,
  ach_credit_percentage_fee: 0.002,
  chargeback_fixed_fee_cents: 1500,
  refund_fixed_fee_cents: 0,
  monthly_fee_cents: 0,
};

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
  fixed_fee_cents: number;
  percentage_fee: number;
  card_present_fixed_fee_cents: number;
  card_present_percentage_fee: number;
  card_not_present_fixed_fee_cents: number;
  card_not_present_percentage_fee: number;
  ach_debit_fixed_fee_cents: number;
  ach_debit_percentage_fee: number;
  ach_credit_fixed_fee_cents: number;
  ach_credit_percentage_fee: number;
  chargeback_fixed_fee_cents: number;
  refund_fixed_fee_cents: number;
  monthly_fee_cents: number;
  sync_status: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

const FeesTab: React.FC<FeesTabProps> = ({ merchant }) => {
  const [feeProfile, setFeeProfile] = useState<FeeProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<FeeProfile>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [profileLoading, setProfileLoading] = useState(true);
  
  const { fetchFeeProfile, createFeeProfile, updateFeeProfile, isLoading } = useMerchants();
  const { hasRole } = useUserRole();
  const { toast } = useToast();
  
  const isSuperAdmin = hasRole('superAdmin');

  useEffect(() => {
    loadFeeProfile();
  }, [merchant.id]);

  const loadFeeProfile = async () => {
    setProfileLoading(true);
    try {
      const profile = await fetchFeeProfile(merchant.id);
      setFeeProfile(profile);
      if (profile) {
        setFormData(profile);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleInputChange = (field: keyof FeeProfile, value: string) => {
    // Mark field as touched when user types
    setTouchedFields(prev => new Set(prev).add(field));
    
    let numericValue: number;
    if (field.includes('percentage')) {
      // Convert percentage input (e.g., "2.9") to decimal (e.g., 0.029)
      numericValue = (parseFloat(value) || 0) / 100;
    } else {
      // For cents fields, keep as integer
      numericValue = parseInt(value) || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handleInputFocus = (field: keyof FeeProfile) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const getInputValue = (field: keyof FeeProfile) => {
    if (touchedFields.has(field)) {
      if (formData[field] !== undefined && formData[field] !== 0) {
        // For percentage fields, convert decimal to percentage for display
        if (field.includes('percentage')) {
          return (formData[field] as number) * 100;
        }
        return formData[field];
      }
      return '';
    }
    return '';
  };

  const getPlaceholderText = (field: keyof FeeProfile) => {
    const defaultValue = DEFAULT_VALUES[field as keyof typeof DEFAULT_VALUES];
    if (field.includes('percentage')) {
      return `${(defaultValue * 100).toFixed(1)}%`;
    }
    return `${defaultValue} cents`;
  };

  const handleSave = async () => {
    try {
      if (feeProfile) {
        await updateFeeProfile(merchant.id, formData);
      } else {
        await createFeeProfile(merchant.id, formData);
      }
      await loadFeeProfile();
      setIsEditing(false);
    } catch (error) {
      // Error handled in the hook
    }
  };

  const handleCancel = () => {
    setFormData(feeProfile || {});
    setTouchedFields(new Set());
    setIsEditing(false);
  };

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatPercentage = (decimal: number) => {
    return `${(decimal * 100).toFixed(2)}%`;
  };

  if (profileLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Fee Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!feeProfile && !isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Fee Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No fee profile configured for this merchant. Contact your administrator to set up fee configuration.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show editing form when isEditing is true (for both creating and editing)
  if (isEditing) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {feeProfile ? 'Edit Fee Profile' : 'Create Fee Profile'}
              </CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* General Fees */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                General Processing Fees
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="percentage_fee">Percentage Fee</Label>
                  <Input
                    id="percentage_fee"
                    type="number"
                    step="0.0001"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    value={getInputValue('percentage_fee')}
                    onChange={(e) => handleInputChange('percentage_fee', e.target.value)}
                    onFocus={() => handleInputFocus('percentage_fee')}
                    placeholder={getPlaceholderText('percentage_fee')}
                  />
                </div>
                <div>
                  <Label htmlFor="fixed_fee_cents">Fixed Fee</Label>
                  <Input
                    id="fixed_fee_cents"
                    type="number"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    value={getInputValue('fixed_fee_cents')}
                    onChange={(e) => handleInputChange('fixed_fee_cents', e.target.value)}
                    onFocus={() => handleInputFocus('fixed_fee_cents')}
                    placeholder={getPlaceholderText('fixed_fee_cents')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Card Processing Fees */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Card Processing Fees
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="card_present_percentage_fee">Card Present - Percentage Fee</Label>
                    <Input
                      id="card_present_percentage_fee"
                      type="number"
                      step="0.0001"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('card_present_percentage_fee')}
                      onChange={(e) => handleInputChange('card_present_percentage_fee', e.target.value)}
                      onFocus={() => handleInputFocus('card_present_percentage_fee')}
                      placeholder={getPlaceholderText('card_present_percentage_fee')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="card_present_fixed_fee_cents">Card Present - Fixed Fee</Label>
                    <Input
                      id="card_present_fixed_fee_cents"
                      type="number"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('card_present_fixed_fee_cents')}
                      onChange={(e) => handleInputChange('card_present_fixed_fee_cents', e.target.value)}
                      onFocus={() => handleInputFocus('card_present_fixed_fee_cents')}
                      placeholder={getPlaceholderText('card_present_fixed_fee_cents')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="card_not_present_percentage_fee">Card Not Present - Percentage Fee</Label>
                    <Input
                      id="card_not_present_percentage_fee"
                      type="number"
                      step="0.0001"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('card_not_present_percentage_fee')}
                      onChange={(e) => handleInputChange('card_not_present_percentage_fee', e.target.value)}
                      onFocus={() => handleInputFocus('card_not_present_percentage_fee')}
                      placeholder={getPlaceholderText('card_not_present_percentage_fee')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="card_not_present_fixed_fee_cents">Card Not Present - Fixed Fee</Label>
                    <Input
                      id="card_not_present_fixed_fee_cents"
                      type="number"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('card_not_present_fixed_fee_cents')}
                      onChange={(e) => handleInputChange('card_not_present_fixed_fee_cents', e.target.value)}
                      onFocus={() => handleInputFocus('card_not_present_fixed_fee_cents')}
                      placeholder={getPlaceholderText('card_not_present_fixed_fee_cents')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ACH Fees */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Building className="h-4 w-4" />
                ACH Processing Fees
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ach_debit_percentage_fee">ACH Debit - Percentage Fee</Label>
                    <Input
                      id="ach_debit_percentage_fee"
                      type="number"
                      step="0.0001"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('ach_debit_percentage_fee')}
                      onChange={(e) => handleInputChange('ach_debit_percentage_fee', e.target.value)}
                      onFocus={() => handleInputFocus('ach_debit_percentage_fee')}
                      placeholder={getPlaceholderText('ach_debit_percentage_fee')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ach_debit_fixed_fee_cents">ACH Debit - Fixed Fee</Label>
                    <Input
                      id="ach_debit_fixed_fee_cents"
                      type="number"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('ach_debit_fixed_fee_cents')}
                      onChange={(e) => handleInputChange('ach_debit_fixed_fee_cents', e.target.value)}
                      onFocus={() => handleInputFocus('ach_debit_fixed_fee_cents')}
                      placeholder={getPlaceholderText('ach_debit_fixed_fee_cents')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ach_credit_percentage_fee">ACH Credit - Percentage Fee</Label>
                    <Input
                      id="ach_credit_percentage_fee"
                      type="number"
                      step="0.0001"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('ach_credit_percentage_fee')}
                      onChange={(e) => handleInputChange('ach_credit_percentage_fee', e.target.value)}
                      onFocus={() => handleInputFocus('ach_credit_percentage_fee')}
                      placeholder={getPlaceholderText('ach_credit_percentage_fee')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ach_credit_fixed_fee_cents">ACH Credit - Fixed Fee</Label>
                    <Input
                      id="ach_credit_fixed_fee_cents"
                      type="number"
                      className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      value={getInputValue('ach_credit_fixed_fee_cents')}
                      onChange={(e) => handleInputChange('ach_credit_fixed_fee_cents', e.target.value)}
                      onFocus={() => handleInputFocus('ach_credit_fixed_fee_cents')}
                      placeholder={getPlaceholderText('ach_credit_fixed_fee_cents')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Fees */}
            <div>
              <h3 className="text-lg font-medium mb-4">Additional Fees</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="chargeback_fixed_fee_cents">Chargeback Fee</Label>
                  <Input
                    id="chargeback_fixed_fee_cents"
                    type="number"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    value={getInputValue('chargeback_fixed_fee_cents')}
                    onChange={(e) => handleInputChange('chargeback_fixed_fee_cents', e.target.value)}
                    onFocus={() => handleInputFocus('chargeback_fixed_fee_cents')}
                    placeholder={getPlaceholderText('chargeback_fixed_fee_cents')}
                  />
                </div>
                <div>
                  <Label htmlFor="refund_fixed_fee_cents">Refund Fee</Label>
                  <Input
                    id="refund_fixed_fee_cents"
                    type="number"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    value={getInputValue('refund_fixed_fee_cents')}
                    onChange={(e) => handleInputChange('refund_fixed_fee_cents', e.target.value)}
                    onFocus={() => handleInputFocus('refund_fixed_fee_cents')}
                    placeholder={getPlaceholderText('refund_fixed_fee_cents')}
                  />
                </div>
                <div>
                  <Label htmlFor="monthly_fee_cents">Monthly Fee</Label>
                  <Input
                    id="monthly_fee_cents"
                    type="number"
                    className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    value={getInputValue('monthly_fee_cents')}
                    onChange={(e) => handleInputChange('monthly_fee_cents', e.target.value)}
                    onFocus={() => handleInputFocus('monthly_fee_cents')}
                    placeholder={getPlaceholderText('monthly_fee_cents')}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : feeProfile ? 'Save Changes' : 'Create Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!feeProfile && isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Fee Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Button onClick={() => setIsEditing(true)} disabled={isLoading} className="mb-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Fee Profile
            </Button>
            <h3 className="text-lg font-medium mb-2">No Fee Profile Configured</h3>
            <p className="text-muted-foreground">
              Create a custom fee profile for {merchant.merchant_name} to manage processing fees.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Fee Profile
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={feeProfile?.sync_status === 'synced' ? 'default' : 'secondary'}>
                {feeProfile?.sync_status === 'synced' ? 'Synced' : 'Pending'}
              </Badge>
              {isSuperAdmin && (
                <Button
                  variant={isEditing ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                  disabled={isLoading}
                >
                  {isEditing ? (
                    <>Cancel</>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSuperAdmin && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Fee configuration is read-only. Contact your administrator to make changes.
              </AlertDescription>
            </Alert>
          )}

          {/* General Fees */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              General Processing Fees
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fixed_fee_cents">Fixed Fee</Label>
                {isEditing ? (
                  <Input
                    id="fixed_fee_cents"
                    type="number"
                    value={formData.fixed_fee_cents || 0}
                    onChange={(e) => handleInputChange('fixed_fee_cents', e.target.value)}
                    placeholder="Amount in cents"
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {formatCents(feeProfile?.fixed_fee_cents || 0)}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="percentage_fee">Percentage Fee</Label>
                {isEditing ? (
                  <Input
                    id="percentage_fee"
                    type="number"
                    step="0.0001"
                    value={formData.percentage_fee || 0}
                    onChange={(e) => handleInputChange('percentage_fee', e.target.value)}
                    placeholder="Decimal (e.g., 0.029 for 2.9%)"
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {formatPercentage(feeProfile?.percentage_fee || 0)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Card Processing Fees */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card Processing Fees
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card_present_fixed_fee_cents">Card Present - Fixed Fee</Label>
                  {isEditing ? (
                    <Input
                      id="card_present_fixed_fee_cents"
                      type="number"
                      value={formData.card_present_fixed_fee_cents || 0}
                      onChange={(e) => handleInputChange('card_present_fixed_fee_cents', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatCents(feeProfile?.card_present_fixed_fee_cents || 0)}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="card_present_percentage_fee">Card Present - Percentage Fee</Label>
                  {isEditing ? (
                    <Input
                      id="card_present_percentage_fee"
                      type="number"
                      step="0.0001"
                      value={formData.card_present_percentage_fee || 0}
                      onChange={(e) => handleInputChange('card_present_percentage_fee', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatPercentage(feeProfile?.card_present_percentage_fee || 0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card_not_present_fixed_fee_cents">Card Not Present - Fixed Fee</Label>
                  {isEditing ? (
                    <Input
                      id="card_not_present_fixed_fee_cents"
                      type="number"
                      value={formData.card_not_present_fixed_fee_cents || 0}
                      onChange={(e) => handleInputChange('card_not_present_fixed_fee_cents', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatCents(feeProfile?.card_not_present_fixed_fee_cents || 0)}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="card_not_present_percentage_fee">Card Not Present - Percentage Fee</Label>
                  {isEditing ? (
                    <Input
                      id="card_not_present_percentage_fee"
                      type="number"
                      step="0.0001"
                      value={formData.card_not_present_percentage_fee || 0}
                      onChange={(e) => handleInputChange('card_not_present_percentage_fee', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatPercentage(feeProfile?.card_not_present_percentage_fee || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ACH Fees */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Building className="h-4 w-4" />
              ACH Processing Fees
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ach_debit_fixed_fee_cents">ACH Debit - Fixed Fee</Label>
                  {isEditing ? (
                    <Input
                      id="ach_debit_fixed_fee_cents"
                      type="number"
                      value={formData.ach_debit_fixed_fee_cents || 0}
                      onChange={(e) => handleInputChange('ach_debit_fixed_fee_cents', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatCents(feeProfile?.ach_debit_fixed_fee_cents || 0)}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="ach_debit_percentage_fee">ACH Debit - Percentage Fee</Label>
                  {isEditing ? (
                    <Input
                      id="ach_debit_percentage_fee"
                      type="number"
                      step="0.0001"
                      value={formData.ach_debit_percentage_fee || 0}
                      onChange={(e) => handleInputChange('ach_debit_percentage_fee', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatPercentage(feeProfile?.ach_debit_percentage_fee || 0)}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ach_credit_fixed_fee_cents">ACH Credit - Fixed Fee</Label>
                  {isEditing ? (
                    <Input
                      id="ach_credit_fixed_fee_cents"
                      type="number"
                      value={formData.ach_credit_fixed_fee_cents || 0}
                      onChange={(e) => handleInputChange('ach_credit_fixed_fee_cents', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatCents(feeProfile?.ach_credit_fixed_fee_cents || 0)}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="ach_credit_percentage_fee">ACH Credit - Percentage Fee</Label>
                  {isEditing ? (
                    <Input
                      id="ach_credit_percentage_fee"
                      type="number"
                      step="0.0001"
                      value={formData.ach_credit_percentage_fee || 0}
                      onChange={(e) => handleInputChange('ach_credit_percentage_fee', e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 bg-muted rounded-md">
                      {formatPercentage(feeProfile?.ach_credit_percentage_fee || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Fees */}
          <div>
            <h3 className="text-lg font-medium mb-4">Additional Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="chargeback_fixed_fee_cents">Chargeback Fee</Label>
                {isEditing ? (
                  <Input
                    id="chargeback_fixed_fee_cents"
                    type="number"
                    value={formData.chargeback_fixed_fee_cents || 0}
                    onChange={(e) => handleInputChange('chargeback_fixed_fee_cents', e.target.value)}
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {formatCents(feeProfile?.chargeback_fixed_fee_cents || 0)}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="refund_fixed_fee_cents">Refund Fee</Label>
                {isEditing ? (
                  <Input
                    id="refund_fixed_fee_cents"
                    type="number"
                    value={formData.refund_fixed_fee_cents || 0}
                    onChange={(e) => handleInputChange('refund_fixed_fee_cents', e.target.value)}
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {formatCents(feeProfile?.refund_fixed_fee_cents || 0)}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="monthly_fee_cents">Monthly Fee</Label>
                {isEditing ? (
                  <Input
                    id="monthly_fee_cents"
                    type="number"
                    value={formData.monthly_fee_cents || 0}
                    onChange={(e) => handleInputChange('monthly_fee_cents', e.target.value)}
                  />
                ) : (
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {formatCents(feeProfile?.monthly_fee_cents || 0)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {feeProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sync Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Last synced: {feeProfile.last_synced_at ? new Date(feeProfile.last_synced_at).toLocaleString() : 'Never'}</p>
              <p>Created: {new Date(feeProfile.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(feeProfile.updated_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeesTab;