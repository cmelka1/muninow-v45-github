import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateRequest } from '@/hooks/usePermitRequests';
import { useToast } from '@/hooks/use-toast';

interface RequestInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permitId: string;
}

export const RequestInformationDialog: React.FC<RequestInformationDialogProps> = ({
  open,
  onOpenChange,
  permitId,
}) => {
  const [requestType, setRequestType] = useState('information_request');
  const [requestDetails, setRequestDetails] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRequest = useCreateRequest();
  const { toast } = useToast();

  const requestTypes = [
    { value: 'information_request', label: 'Additional Information Request' },
    { value: 'document_request', label: 'Additional Documentation' },
    { value: 'clarification', label: 'Clarification Required' },
    { value: 'correction', label: 'Correction Required' },
    { value: 'revision', label: 'Plan Revision Required' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestDetails.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide request details.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createRequest.mutateAsync({
        permit_id: permitId,
        request_type: requestType,
        request_details: requestDetails,
        due_date: dueDate?.toISOString(),
      });

      toast({
        title: 'Success',
        description: 'Information request sent successfully.',
      });

      // Reset form
      setRequestType('information_request');
      setRequestDetails('');
      setDueDate(undefined);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Information</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="request-type">Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-details">Request Details *</Label>
            <Textarea
              id="request-details"
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
              placeholder="Please describe what information or documentation is needed..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a due date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};