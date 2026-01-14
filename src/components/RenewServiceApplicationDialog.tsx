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
import { useServiceApplicationRenewal } from '@/hooks/useServiceApplicationRenewal';
import { useToast } from '@/hooks/use-toast';

interface RenewServiceApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    id: string;
    application_number?: string;
    service_name: string;
    applicant_name?: string;
    business_legal_name?: string;
    expires_at?: string;
    base_amount_cents: number;
    renewal_reminder_days?: number;
  };
}

export const RenewServiceApplicationDialog = ({
  open,
  onOpenChange,
  application,
}: RenewServiceApplicationDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { renewApplication, isRenewing } = useServiceApplicationRenewal();
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
      // If information is current, auto-approve (true). 
      // If not, creates draft (false) for them to edit.
      const newApplicationId = await renewApplication({ 
        applicationId: application.id, 
        autoApprove: isCurrent 
      });
      
      onOpenChange(false);
      
      if (isCurrent) {
        // If approved, go to payment/details (backend sets simple 'approved' logic? 
        // Actually for Service Apps, backend sets 'approved' if autoApprove=true)
        // We probably want to go to the detail page in either case.
        navigate(`/service-application/${newApplicationId}`);
      } else {
        // If not current, it's a draft. Navigate to it so they can edit.
        toast({
          title: "Renewal Started",
          description: "A draft renewal has been created. Please update your information and submit.",
        });
        navigate(`/service-application/${newApplicationId}`);
      }
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getDaysUntilExpiration = () => {
    if (!application.expires_at) return null;
    const now = new Date();
    const expiration = new Date(application.expires_at);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysUntilExpiration();
  const renewalReminderDays = application.renewal_reminder_days || 30;

  // Check if user is outside renewal window (shouldn't happen if frontend hides button correctly)
  const isOutsideRenewalWindow = daysRemaining !== null && daysRemaining > renewalReminderDays;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Renew Service Application
          </DialogTitle>
          <DialogDescription>
            Review your application information and confirm renewal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outside Renewal Window Warning */}
          {isOutsideRenewalWindow && application.expires_at && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <AlertCircle className="h-5 w-5 mt-0.5 text-gray-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Renewal Not Yet Available</p>
                <p className="text-sm text-gray-700 mt-1">
                  You can renew this application starting {renewalReminderDays} days before expiration 
                  (on {format(new Date(new Date(application.expires_at).getTime() - renewalReminderDays * 24 * 60 * 60 * 1000), 'MMMM d, yyyy')}).
                </p>
              </div>
            </div>
          )}

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
                    ? 'Application Expired' 
                    : daysRemaining === 1
                      ? 'Application Expires Tomorrow'
                      : `Application Expires in ${daysRemaining} Days`
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
                    ? 'Your application has expired. Please renew immediately'
                    : 'Renew now to avoid service interruption.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Application Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Current Application</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Application Number</p>
                  <p className="font-medium">{application.application_number || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Service Type</p>
                  <p className="font-medium">{application.service_name}</p>
                </div>
              </div>
            </div>

            {(application.applicant_name || application.business_legal_name) && (
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">
                  {application.applicant_name || application.business_legal_name}
                </p>
              </div>
            )}

            {application.expires_at && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="font-medium">{format(new Date(application.expires_at), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Renewal Fee</p>
                <p className="font-medium text-lg">{formatCurrency(application.base_amount_cents)}</p>
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
            disabled={isCurrent === null || isRenewing || isOutsideRenewalWindow}
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
