import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useServiceApplicationWorkflow, ServiceApplicationStatus, getStatusDisplayName, getStatusDescription, getValidStatusTransitions } from '@/hooks/useServiceApplicationWorkflow';

interface ServiceApplicationStatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  currentStatus: ServiceApplicationStatus;
  onStatusChange?: () => void;
}

export const ServiceApplicationStatusChangeDialog: React.FC<ServiceApplicationStatusChangeDialogProps> = ({
  isOpen,
  onClose,
  applicationId,
  currentStatus,
  onStatusChange
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ServiceApplicationStatus | ''>('');
  const [reason, setReason] = useState('');
  const { updateApplicationStatus, isUpdating } = useServiceApplicationWorkflow();

  const validTransitions = getValidStatusTransitions(currentStatus);

  const handleSubmit = async () => {
    if (!selectedStatus) return;

    const success = await updateApplicationStatus(applicationId, selectedStatus, reason || undefined);
    if (success) {
      handleClose();
      onStatusChange?.();
    }
  };

  const handleClose = () => {
    setSelectedStatus('');
    setReason('');
    onClose();
  };

  const requiresReason = selectedStatus === 'denied' || selectedStatus === 'rejected' || 
                        selectedStatus === 'information_requested' || selectedStatus === 'withdrawn';
  const isSubmitDisabled = !selectedStatus || isUpdating || (requiresReason && !reason.trim());

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Application Status</DialogTitle>
          <DialogDescription>
            Update the status of this service application. Current status: <strong>{getStatusDisplayName(currentStatus)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-status">New Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ServiceApplicationStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {validTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getStatusDisplayName(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStatus && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">{getStatusDescription(selectedStatus)}</p>
            </div>
          )}

          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {selectedStatus === 'information_requested' ? 'Information Request Reason' : 
                 selectedStatus === 'withdrawn' ? 'Withdrawal Reason' : 'Denial Reason'} 
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  selectedStatus === 'information_requested' 
                    ? "Specify what additional information is needed..."
                    : selectedStatus === 'withdrawn'
                    ? "Explain why the application is being withdrawn..."
                    : "Provide the reason for this decision..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isUpdating ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};