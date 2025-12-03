import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MoreVertical, Check, X, AlertCircle, Eye, Loader2 } from 'lucide-react';
import { useQuickApproval } from '@/hooks/useQuickApproval';
import { useNavigate } from 'react-router-dom';

interface InlineApprovalMenuProps {
  applicationId: string;
  onActionComplete?: () => void;
}

export const InlineApprovalMenu: React.FC<InlineApprovalMenuProps> = ({
  applicationId,
  onActionComplete,
}) => {
  const navigate = useNavigate();
  const { mutate: quickApproval, isPending } = useQuickApproval();
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [requestInfoDialogOpen, setRequestInfoDialogOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleApprove = () => {
    quickApproval(
      { applicationId, action: 'approve' },
      {
        onSuccess: () => {
          onActionComplete?.();
        },
      }
    );
  };

  const handleDeny = () => {
    if (!denyReason.trim()) return;
    
    quickApproval(
      { applicationId, action: 'deny', reason: denyReason },
      {
        onSuccess: () => {
          setDenyDialogOpen(false);
          setDenyReason('');
          onActionComplete?.();
        },
      }
    );
  };

  const handleRequestInfo = () => {
    if (!infoMessage.trim()) return;
    
    quickApproval(
      { applicationId, action: 'request_info', message: infoMessage },
      {
        onSuccess: () => {
          setRequestInfoDialogOpen(false);
          setInfoMessage('');
          onActionComplete?.();
        },
      }
    );
  };

  const handleViewDetails = () => {
    navigate(`/municipal/service-application/${applicationId}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleApprove} disabled={isPending}>
            <Check className="h-4 w-4 mr-2 text-green-600" />
            Approve
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRequestInfoDialogOpen(true)} disabled={isPending}>
            <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
            Request Info
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDenyDialogOpen(true)} disabled={isPending}>
            <X className="h-4 w-4 mr-2 text-red-600" />
            Deny
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deny-reason">Reason for Denial</Label>
              <Textarea
                id="deny-reason"
                placeholder="Provide a reason for denying this booking..."
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={!denyReason.trim() || isPending}
            >
              Deny Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Info Dialog */}
      <Dialog open={requestInfoDialogOpen} onOpenChange={setRequestInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="info-message">Message to Applicant</Label>
              <Textarea
                id="info-message"
                placeholder="What information do you need from the applicant?"
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestInfoDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestInfo}
              disabled={!infoMessage.trim() || isPending}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
