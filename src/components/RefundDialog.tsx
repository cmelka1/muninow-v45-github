import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentDetails: {
    id: string;
    bill_id: string;
    amount_cents: number;
    total_amount_cents: number;
    finix_transfer_id: string;
    user_id: string;
    master_bills: {
      external_bill_number: string;
    };
  };
  onRefundCreated: () => void;
}

const REFUND_REASONS = [
  'Duplicate Payment',
  'Overpayment',
  'Service Not Provided',
  'Bill Error',
  'Customer Request',
  'System Error',
  'Other'
];

export const RefundDialog: React.FC<RefundDialogProps> = ({
  open,
  onOpenChange,
  paymentDetails,
  onRefundCreated
}) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        title: "Error",
        description: "Please select a refund reason",
        variant: "destructive"
      });
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a custom reason",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const finalReason = selectedReason === 'Other' ? customReason : selectedReason;

      const { data, error } = await supabase.functions.invoke('process-finix-refund', {
        body: {
          payment_history_id: paymentDetails.id,
          reason: finalReason,
          refund_amount_cents: paymentDetails.total_amount_cents
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Parse the response if it's a string
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Invalid response format');
        }
      }

      if (!parsedData.success) {
        throw new Error(parsedData.error || 'Refund processing failed');
      }

      // Handle different refund statuses
      const status = parsedData.refund?.refund_status || 'unknown';
      
      if (status === 'unpaid') {
        toast({
          title: "Refund Submitted Successfully",
          description: `Refund request for ${paymentDetails.master_bills.external_bill_number} has been submitted and is being processed. You will be notified when the refund is completed.`,
          variant: "default"
        });
      } else if (status === 'succeeded') {
        toast({
          title: "Refund Completed",
          description: `Refund for ${paymentDetails.master_bills.external_bill_number} has been successfully processed.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Refund Initiated",
          description: `Refund request for ${paymentDetails.master_bills.external_bill_number} has been processed: ${parsedData.message}`,
          variant: "default"
        });
      }

      onRefundCreated();
      onOpenChange(false);
      
      // Reset form
      setSelectedReason('');
      setCustomReason('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create refund request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Create a refund request for bill {paymentDetails.master_bills.external_bill_number}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Refund Amount Display */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Refund Amount</span>
              <span className="text-lg font-bold">
                {formatCurrency(paymentDetails.total_amount_cents)}
              </span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Refund Reason</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Custom Reason</Label>
              <Textarea
                id="customReason"
                placeholder="Please explain the reason for this refund..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? 'Processing...' : 'Process Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};