import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useBusinessLicenseRenewal } from '@/hooks/useBusinessLicenseRenewal';
import { useToast } from '@/hooks/use-toast';

interface RenewBusinessLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license: {
    id: string;
    license_number?: string;
    business_legal_name: string;
    business_type: string;
    expires_at?: string;
    base_amount_cents: number;
  };
}

export const RenewBusinessLicenseDialog = ({
  open,
  onOpenChange,
  license,
}: RenewBusinessLicenseDialogProps) => {
  const navigate = useNavigate();
  const { renewLicense, isRenewing } = useBusinessLicenseRenewal();
  const { toast } = useToast();
  const [isCurrent, setIsCurrent] = useState<boolean | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleConfirmRenewal = async () => {
    if (isCurrent === null) return;

    try {
      const newLicenseId = await renewLicense({
        licenseId: license.id,
        autoApprove: isCurrent
      });
      
      onOpenChange(false);
      
      if (isCurrent) {
        navigate(`/business-license/${newLicenseId}`);
      } else {
         toast({
          title: "Renewal Started",
          description: "A draft renewal has been created. Please update your information and submit.",
        });
        navigate(`/business-license/${newLicenseId}`);
      }
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getDaysUntilExpiration = () => {
    if (!license.expires_at) return null;
    const now = new Date();
    const expiration = new Date(license.expires_at);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysUntilExpiration();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Renew Business License
          </DialogTitle>
          <DialogDescription>
            Review your license information and confirm renewal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Urgency Warning */}
          {daysRemaining !== null && daysRemaining <= 30 && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              daysRemaining <= 0 
                ? 'bg-red-50 border border-red-200' 
                : daysRemaining <= 7
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <AlertCircle className={`h-5 w-5 mt-0.5 ${
                daysRemaining <= 0 
                  ? 'text-red-600' 
                  : daysRemaining <= 7
                    ? 'text-orange-600'
                    : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className={`font-medium ${
                  daysRemaining <= 0 
                    ? 'text-red-900' 
                    : daysRemaining <= 7
                      ? 'text-orange-900'
                      : 'text-yellow-900'
                }`}>
                  {daysRemaining <= 0 
                    ? 'License Expired' 
                    : daysRemaining === 1
                      ? 'License Expires Tomorrow'
                      : `License Expires in ${daysRemaining} Days`
                  }
                </p>
                <p className={`text-sm ${
                  daysRemaining <= 0 
                    ? 'text-red-700' 
                    : daysRemaining <= 7
                      ? 'text-orange-700'
                      : 'text-yellow-700'
                }`}>
                  {daysRemaining <= 0 
                    ? 'Your license has expired. Please renew immediately'
                    : 'Renew now to avoid interruption in your business operations.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* License Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Current License</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">License Number</p>
                  <p className="font-medium">{license.license_number || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Business Type</p>
                  <p className="font-medium">{license.business_type}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Business Name</p>
              <p className="font-medium">{license.business_legal_name}</p>
            </div>

            {license.expires_at && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="font-medium">{format(new Date(license.expires_at), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Renewal Fee</p>
                <p className="font-medium text-lg">{formatCurrency(license.base_amount_cents)}</p>
              </div>
            </div>
          </div>

          {/* Change Info Selection */}
          <div className="space-y-3 pt-2">
            <Label className="text-base font-semibold">Is your information current?</Label>
            <div className="grid grid-cols-1 gap-3">
              <div 
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  isCurrent === true ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setIsCurrent(true)}
              >
                <div className={`mt-0.5 h-4 w-4 rounded-full border border-primary flex items-center justify-center ${
                  isCurrent === true ? 'bg-primary' : ''
                }`}>
                  {isCurrent === true && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-medium">Yes, my information is current</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Proceed with automatic approval.
                  </p>
                </div>
              </div>

              <div 
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  isCurrent === false ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setIsCurrent(false)}
              >
                <div className={`mt-0.5 h-4 w-4 rounded-full border border-primary flex items-center justify-center ${
                  isCurrent === false ? 'bg-primary' : ''
                }`}>
                  {isCurrent === false && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-medium">No, I need to make changes</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a draft application to update your information.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRenewing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRenewal}
            disabled={isCurrent === null || isRenewing}
          >
            {isRenewing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Renewal...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Confirm Renewal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
