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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PermitStatus, 
  getStatusDisplayName, 
  getStatusDescription,
  getValidStatusTransitions,
  usePermitWorkflow 
} from '@/hooks/usePermitWorkflow';

interface PermitStatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  permitId: string;
  currentStatus: PermitStatus;
  onStatusChanged?: () => void;
}

export const PermitStatusChangeDialog: React.FC<PermitStatusChangeDialogProps> = ({
  isOpen,
  onClose,
  permitId,
  currentStatus,
  onStatusChanged
}) => {
  const [selectedStatus, setSelectedStatus] = useState<PermitStatus | ''>('');
  const [reason, setReason] = useState('');
  const { updatePermitStatus, isUpdating } = usePermitWorkflow();

  const validTransitions = getValidStatusTransitions(currentStatus);

  const handleSubmit = async () => {
    if (!selectedStatus) return;

    const success = await updatePermitStatus(
      permitId, 
      selectedStatus as PermitStatus, 
      reason || undefined
    );

    if (success) {
      onStatusChanged?.();
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedStatus('');
    setReason('');
    onClose();
  };

  const requiresReason = selectedStatus === 'denied' || selectedStatus === 'withdrawn';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Permit Status</DialogTitle>
          <DialogDescription>
            Update the status of this permit application. Current status: {' '}
            <span className="font-medium">{getStatusDisplayName(currentStatus)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select 
              value={selectedStatus} 
              onValueChange={(value) => setSelectedStatus(value as PermitStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {validTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div>
                      <div className="font-medium">{getStatusDisplayName(status)}</div>
                      <div className="text-sm text-muted-foreground">
                        {getStatusDescription(status)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStatus && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                {getStatusDescription(selectedStatus as PermitStatus)}
              </p>
            </div>
          )}

          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {selectedStatus === 'denied' ? 'Denial Reason *' : 'Withdrawal Reason *'}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  selectedStatus === 'denied' ? 'Explain why the permit was denied...' :
                  'Reason for withdrawal...'
                }
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={
              !selectedStatus || 
              isUpdating ||
              (requiresReason && !reason.trim())
            }
          >
            {isUpdating ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};