import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, Calendar, DollarSign, Settings, Trash2, MapPin } from 'lucide-react';
import { SportFacility, useCreateSportFacility, useUpdateSportFacility, useDeleteSportFacility } from '@/hooks/useSportFacilities';
import { useMerchants } from '@/hooks/useMerchants';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface SportFacilityFormProps {
  facility?: SportFacility | null;
  customerId?: string;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const INTERVAL_OPTIONS = [
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
];

const STANDARD_FORM_FIELDS = [
  { id: 'name', label: 'Full Name', type: 'text' as const, required: true, placeholder: 'Enter your full name' },
  { id: 'phone', label: 'Phone Number', type: 'phone' as const, required: true, placeholder: 'Enter your phone number' },
  { id: 'email', label: 'Email Address', type: 'email' as const, required: true, placeholder: 'Enter your email address' },
  { id: 'additional_information', label: 'Additional Information', type: 'textarea' as const, required: false, placeholder: 'Any special requests or notes...' }
];

export function SportFacilityForm({ facility, customerId, onClose }: SportFacilityFormProps) {
  const { profile } = useAuth();
  const { merchants, isLoading: merchantsLoading, fetchMerchantsByCustomer } = useMerchants();
  const createFacility = useCreateSportFacility();
  const updateFacility = useUpdateSportFacility();
  const deleteFacility = useDeleteSportFacility();

  // Basic info
  const [title, setTitle] = useState(facility?.title || '');
  const [description, setDescription] = useState(facility?.description || '');
  const [isActive, setIsActive] = useState(facility?.is_active !== false);

  // Pricing
  const [requiresPayment, setRequiresPayment] = useState(facility?.requires_payment !== false);
  const [amountDollars, setAmountDollars] = useState(facility ? (facility.amount_cents / 100).toString() : '0');
  const [selectedMerchantId, setSelectedMerchantId] = useState(facility?.merchant_id || '');

  // Scheduling - always enabled for sport facilities
  const [bookingMode, setBookingMode] = useState<'time_period' | 'start_time'>(facility?.booking_mode || 'time_period');
  const [slotDuration, setSlotDuration] = useState(facility?.time_slot_config?.slot_duration_minutes || 60);
  const [startTimeInterval, setStartTimeInterval] = useState(facility?.time_slot_config?.start_time_interval_minutes || 30);
  const [availableDays, setAvailableDays] = useState<string[]>(
    facility?.time_slot_config?.available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  );
  const [startTime, setStartTime] = useState(facility?.time_slot_config?.start_time || '08:00');
  const [endTime, setEndTime] = useState(facility?.time_slot_config?.end_time || '20:00');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(facility?.time_slot_config?.max_advance_days || 30);

  // Settings
  const [requiresReview, setRequiresReview] = useState(facility?.requires_review || false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const customerIdToUse = customerId || profile?.customer_id;
    if (customerIdToUse) {
      fetchMerchantsByCustomer(customerIdToUse);
    }
  }, [customerId, profile?.customer_id]);

  const selectedMerchant = merchants?.find(m => m.id === selectedMerchantId);

  const toggleDay = (day: string) => {
    setAvailableDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: 'Error', description: 'Facility name is required', variant: 'destructive' });
      return;
    }

    if (availableDays.length === 0) {
      toast({ title: 'Error', description: 'Select at least one available day', variant: 'destructive' });
      return;
    }

    if (endTime <= startTime) {
      toast({ title: 'Error', description: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    const amountCents = Math.round(parseFloat(amountDollars || '0') * 100);

    const facilityData = {
      title: title.trim(),
      description: description.trim() || undefined,
      amount_cents: requiresPayment ? amountCents : 0,
      requires_review: requiresReview,
      requires_payment: requiresPayment,
      requires_document_upload: false,
      is_active: isActive,
      auto_populate_user_info: false,
      allow_user_defined_amount: false,
      merchant_id: requiresPayment ? (selectedMerchantId || undefined) : undefined,
      finix_merchant_id: requiresPayment ? (selectedMerchant?.finix_merchant_id || undefined) : undefined,
      form_fields: STANDARD_FORM_FIELDS,
      is_renewable: false,
      has_time_slots: true as const,
      booking_mode: bookingMode,
      time_slot_config: {
        slot_duration_minutes: slotDuration,
        start_time_interval_minutes: bookingMode === 'start_time' ? startTimeInterval : undefined,
        available_days: availableDays,
        start_time: startTime,
        end_time: endTime,
        max_advance_days: maxAdvanceDays,
        timezone: 'America/New_York',
      },
      customer_id: customerId || profile?.customer_id!,
      created_by: profile?.id!,
    };

    try {
      if (facility) {
        await updateFacility.mutateAsync({ id: facility.id, ...facilityData });
      } else {
        await createFacility.mutateAsync(facilityData as any);
      }
      onClose();
    } catch (error) {
      console.error('Error saving facility:', error);
    }
  };

  const handleDelete = async () => {
    if (!facility) return;
    try {
      await deleteFacility.mutateAsync(facility.id);
      onClose();
    } catch (error) {
      console.error('Error deleting facility:', error);
    }
  };

  const isSubmitting = createFacility.isPending || updateFacility.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Facility Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Facility Name *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Tennis Court A, Soccer Field 1"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the facility, amenities, rules..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">Make this facility available for booking</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Booking Mode</Label>
            <Select value={bookingMode} onValueChange={(v) => setBookingMode(v as 'time_period' | 'start_time')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time_period">Fixed Duration (e.g., 1 hour blocks)</SelectItem>
                <SelectItem value="start_time">Flexible Start Times</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {bookingMode === 'time_period' 
                ? 'Bookings are fixed-length blocks (e.g., 9:00-10:00, 10:00-11:00)' 
                : 'Users can select any start time at specified intervals'}
            </p>
          </div>

          {bookingMode === 'time_period' ? (
            <div>
              <Label>Slot Duration</Label>
              <Select value={slotDuration.toString()} onValueChange={(v) => setSlotDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Start Time Interval</Label>
              <Select value={startTimeInterval.toString()} onValueChange={(v) => setStartTimeInterval(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Opening Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Closing Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Available Days</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS_OF_WEEK.map(day => (
                <Badge
                  key={day}
                  variant={availableDays.includes(day) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleDay(day)}
                >
                  {day.slice(0, 3)}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Max Advance Booking</Label>
            <Select value={maxAdvanceDays.toString()} onValueChange={(v) => setMaxAdvanceDays(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">1 week ahead</SelectItem>
                <SelectItem value="14">2 weeks ahead</SelectItem>
                <SelectItem value="30">1 month ahead</SelectItem>
                <SelectItem value="60">2 months ahead</SelectItem>
                <SelectItem value="90">3 months ahead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Requires Payment</Label>
              <p className="text-sm text-muted-foreground">Charge a fee for booking</p>
            </div>
            <Switch checked={requiresPayment} onCheckedChange={setRequiresPayment} />
          </div>

          {requiresPayment ? (
            <>
              <div>
                <Label>Price per Booking (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountDollars}
                    onChange={(e) => setAmountDollars(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Payment Merchant</Label>
                <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId} disabled={merchantsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={merchantsLoading ? 'Loading...' : 'Select merchant'} />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants?.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.merchant_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                <strong>Free Booking:</strong> No payment required for this facility.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Requires Review</Label>
              <p className="text-sm text-muted-foreground">Manually approve bookings before confirming</p>
            </div>
            <Switch checked={requiresReview} onCheckedChange={setRequiresReview} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        {facility ? (
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Facility
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Facility?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{facility.title}". Existing bookings will remain but no new bookings can be made.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : facility ? 'Update Facility' : 'Create Facility'}
          </Button>
        </div>
      </div>
    </form>
  );
}
