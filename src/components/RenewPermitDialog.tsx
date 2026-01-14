import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePermitRenewal } from '@/hooks/usePermitRenewal';
import { Loader2, AlertTriangle, FileText, User, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface RenewPermitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permit: {
    permit_id: string;
    permit_number: string;
    property_address: string;
    permit_type_name: string | null;
    applicant_full_name: string;
  };
}

export const RenewPermitDialog: React.FC<RenewPermitDialogProps> = ({
  open,
  onOpenChange,
  permit,
}) => {
  const { mutate: renewPermit, isPending } = usePermitRenewal();

  const handleRenew = () => {
    renewPermit({ originalPermitId: permit.permit_id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew Building Permit</DialogTitle>
          <DialogDescription>
            You are about to renew permit <span className="font-mono font-medium text-foreground">{permit.permit_number}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription className="text-sm mt-1">
              This will create a new draft application based on your current permit. 
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Contractors</strong> will be copied to the new application.</li>
                <li><strong>Documents</strong> will NOT be copied. You will need to upload current documents.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Information to be copied:
            </h4>
            <div className="grid gap-2 pl-6 text-muted-foreground">
              <div className="flex gap-2">
                <MapPin className="h-3 w-3 mt-1 shrink-0" />
                <span>{permit.property_address}</span>
              </div>
              <div className="flex gap-2">
                <User className="h-3 w-3 mt-1 shrink-0" />
                <span>{permit.applicant_full_name}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRenew} 
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Renewal Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
