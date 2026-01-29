import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateInspection } from '@/hooks/usePermitInspections';
import { useToast } from '@/hooks/use-toast';

interface ScheduleInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permitId: string;
}

export const ScheduleInspectionDialog: React.FC<ScheduleInspectionDialogProps> = ({
  open,
  onOpenChange,
  permitId,
}) => {
  const [inspectionType, setInspectionType] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createInspection = useCreateInspection();
  const { toast } = useToast();

  const inspectionTypes = [
    'Preliminary Inspection',
    'Foundation Inspection',
    'Framing Inspection',
    'Electrical Inspection',
    'Plumbing Inspection',
    'HVAC Inspection',
    'Insulation Inspection',
    'Drywall Inspection',
    'Final Inspection',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inspectionType || !scheduledDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createInspection.mutateAsync({
        permit_id: permitId,
        inspection_type: inspectionType,
        scheduled_date: scheduledDate.toISOString(),
        notes: notes || null,
        inspector_id: null,
        completed_date: null,
        status: 'scheduled',
        result: null,
      });

      toast({
        title: 'Success',
        description: 'Inspection scheduled successfully.',
      });

      // Reset form
      setInspectionType('');
      setScheduledDate(undefined);
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule inspection. Please try again.',
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
          <DialogTitle>Schedule Inspection</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inspection-type">Inspection Type *</Label>
            <Select value={inspectionType} onValueChange={setInspectionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select inspection type" />
              </SelectTrigger>
              <SelectContent>
                {inspectionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="space-y-2">
            <Label>Scheduled Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !scheduledDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the inspector..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Inspection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};