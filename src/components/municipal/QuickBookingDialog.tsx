import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useConflictCheck } from '@/hooks/useConflictCheck';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SportFacility } from '@/hooks/useSportFacilities';

interface QuickBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilities: SportFacility[];
  customerId: string | undefined;
  prefilledFacilityId?: string;
  prefilledDate?: string;
  prefilledTime?: string;
  onSuccess?: () => void;
}

export const QuickBookingDialog: React.FC<QuickBookingDialogProps> = ({
  open,
  onOpenChange,
  facilities,
  customerId,
  prefilledFacilityId,
  prefilledDate,
  prefilledTime,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  
  // Helper to get local date string (YYYY-MM-DD)
  const getLocalDateString = (date: Date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  const [facilityId, setFacilityId] = useState(prefilledFacilityId || '');
  const [date, setDate] = useState(prefilledDate || getLocalDateString());
  const [startTime, setStartTime] = useState(prefilledTime || '09:00:00');
  const [duration, setDuration] = useState(60); // minutes
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate end time
  const endTime = React.useMemo(() => {
    const [hours, minutes] = startTime.split(':');
    const start = new Date();
    start.setHours(parseInt(hours), parseInt(minutes), 0);
    start.setMinutes(start.getMinutes() + duration);
    return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}:00`;
  }, [startTime, duration]);

  // Check for conflicts
  const { data: conflictCheck } = useConflictCheck(
    facilityId && date && startTime
      ? { tileId: facilityId, date, startTime, endTime }
      : null
  );

  useEffect(() => {
    if (prefilledFacilityId) setFacilityId(prefilledFacilityId);
    if (prefilledDate) setDate(prefilledDate);
    if (prefilledTime) setStartTime(prefilledTime);
  }, [prefilledFacilityId, prefilledDate, prefilledTime]);

  const invalidateBookingQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['sport-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['daily-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['weekly-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booked-time-slots'] });
    queryClient.invalidateQueries({ queryKey: ['conflict-check'] });
  };

  const handleSubmit = async () => {
    if (!facilityId || !date || !startTime || !firstName || !lastName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (conflictCheck?.hasConflict) {
      toast({
        title: 'Time Conflict',
        description: 'This time slot is already booked',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!customerId) throw new Error('Customer ID not found');

      const { error } = await supabase
        .from('municipal_service_applications')
        .insert({
          tile_id: facilityId,
          user_id: user.id,
          customer_id: customerId,
          booking_date: date,
          booking_start_time: startTime,
          booking_end_time: endTime,
          applicant_name: `${firstName} ${lastName}`,
          applicant_email: email || null,
          applicant_phone: phone || null,
          status: 'approved', // Staff bookings are pre-approved
          approved_at: new Date().toISOString(),
          additional_information: notes || null,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Booking created successfully',
      });

      // Invalidate all booking-related queries
      invalidateBookingQueries();

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFacilityId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create booking',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="facility">Facility *</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime.slice(0, 5)}
                onChange={(e) => setStartTime(`${e.target.value}:00`)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {conflictCheck?.hasConflict && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This time slot conflicts with an existing booking. Please choose a different time.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name *</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name *</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || conflictCheck?.hasConflict}
          >
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
