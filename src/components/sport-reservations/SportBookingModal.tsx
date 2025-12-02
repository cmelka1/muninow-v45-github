import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Calendar, User, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { SportFacility } from '@/hooks/useSportFacilities';
import { TimeSlotBooking } from '@/components/TimeSlotBooking';
import { InlinePaymentFlow } from '@/components/payment/InlinePaymentFlow';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';
import { useServiceApplicationPaymentMethods } from '@/hooks/useServiceApplicationPaymentMethods';
import { extractApplicantData, enrichFormDataWithParsedAddress } from '@/utils/serviceFormUtils';
import { useQueryClient } from '@tanstack/react-query';

interface SportBookingModalProps {
  facility: SportFacility | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SportBookingModal({ facility, isOpen, onClose }: SportBookingModalProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [draftApplicationId, setDraftApplicationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    additional_information: '',
  });

  const totalSteps = facility?.requires_payment ? 3 : 2;
  const progress = (currentStep / totalSteps) * 100;

  // Payment methods hook
  const applicationData = facility && !facility.requires_review ? {
    tile_id: facility.id,
    customer_id: facility.customer_id,
    merchant_id: facility.merchant_id,
    user_id: profile?.id || '',
    form_data: formData,
    documents: [],
    base_amount_cents: facility.amount_cents,
  } : null;

  const paymentMethods = useServiceApplicationPaymentMethods(
    applicationData,
    draftApplicationId || undefined
  );

  // Auto-populate from profile
  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        email: profile.email || '',
        phone: profile.phone || '',
        additional_information: '',
      });
      setCurrentStep(1);
      setSelectedDate(undefined);
      setSelectedTime('');
      setDraftApplicationId(null);
      
      if (facility && !facility.requires_review) {
        paymentMethods.loadPaymentInstruments();
      }
    }
  }, [isOpen, profile, facility]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Selection Required',
        description: 'Please select both a date and time slot.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Required', description: 'Please enter your name.', variant: 'destructive' });
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({ title: 'Required', description: 'Please enter a valid email.', variant: 'destructive' });
      return false;
    }
    if (!formData.phone.trim()) {
      toast({ title: 'Required', description: 'Please enter your phone number.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const calculateEndTime = () => {
    if (!selectedTime || !facility) return null;
    if (facility.booking_mode === 'time_period' && facility.time_slot_config?.slot_duration_minutes) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + facility.time_slot_config.slot_duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;
    }
    return null;
  };

  const createBooking = async () => {
    if (!facility || !profile || !selectedDate || !selectedTime) return null;

    const endTime = calculateEndTime();
    const enrichedFormData = enrichFormDataWithParsedAddress(formData);
    const applicantData = extractApplicantData(enrichedFormData);

    const { data: rpcData, error: rpcError } = await supabase.rpc('create_booking_with_conflict_check', {
      p_tile_id: facility.id,
      p_user_id: profile.id,
      p_customer_id: facility.customer_id,
      p_form_data: { ...formData, ...applicantData },
      p_amount_cents: facility.amount_cents,
      p_booking_date: selectedDate.toISOString().split('T')[0],
      p_booking_start_time: selectedTime,
      p_booking_end_time: endTime,
      p_booking_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      p_application_id: draftApplicationId,
    });

    if (rpcError) throw rpcError;

    type BookingRow = { application_id: string | null; conflict: boolean; message: string };
    const rows = (rpcData as BookingRow[]) || [];
    const row = rows[0];

    if (!row) throw new Error('No response from booking');

    if (row.conflict) {
      toast({
        title: 'Time Slot Unavailable',
        description: row.message || 'This slot was just booked. Please select another time.',
        variant: 'destructive',
      });
      return null;
    }

    return row.application_id;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
    }

    if (currentStep === 2) {
      if (!validateStep2()) return;

      // Create the booking/draft
      setIsSubmitting(true);
      try {
        const appId = await createBooking();
        if (!appId) {
          setIsSubmitting(false);
          return;
        }
        setDraftApplicationId(appId);

        // If no payment required, finalize immediately
        if (!facility?.requires_payment) {
          await supabase
            .from('municipal_service_applications')
            .update({
              status: facility?.requires_review ? 'submitted' : 'approved',
              payment_status: 'not_required',
              submitted_at: new Date().toISOString(),
              ...(facility?.requires_review ? {} : { approved_at: new Date().toISOString() }),
            })
            .eq('id', appId);

          // Invalidate sport booking queries
          queryClient.invalidateQueries({ queryKey: ['sport-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['booked-time-slots'] });
          queryClient.invalidateQueries({ queryKey: ['daily-bookings'] });

          toast({
            title: 'Booking Confirmed!',
            description: facility?.requires_review
              ? 'Your booking request has been submitted for review.'
              : 'Your booking has been confirmed.',
          });
          onClose();
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error creating booking:', error);
        toast({ title: 'Error', description: 'Failed to create booking. Please try again.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      dialogRef.current?.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      dialogRef.current?.scrollTo(0, 0);
    }
  };

  const getStepTitle = () => {
    if (currentStep === 1) return 'Select Date & Time';
    if (currentStep === 2) return 'Contact Information';
    return 'Payment';
  };

  const getStepIcon = () => {
    if (currentStep === 1) return <Calendar className="h-5 w-5" />;
    if (currentStep === 2) return <User className="h-5 w-5" />;
    return <CreditCard className="h-5 w-5" />;
  };

  if (!facility) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent ref={dialogRef} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStepIcon()}
            Book: {facility.title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep} of {totalSteps}: {getStepTitle()}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Content */}
        <div className="py-4">
          {/* Step 1: Date/Time Selection */}
          {currentStep === 1 && (
            <TimeSlotBooking
              tile={facility}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateSelect={setSelectedDate}
              onTimeSelect={setSelectedTime}
            />
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.additional_information}
                  onChange={(e) => handleInputChange('additional_information', e.target.value)}
                  placeholder="Any special requests..."
                  rows={3}
                />
              </div>

              {/* Booking Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Booking Summary</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Facility:</span>
                    <span>{facility.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{selectedDate?.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span>{selectedTime}</span>
                  </div>
                  {facility.requires_payment && (
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(facility.amount_cents)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && facility.requires_payment && draftApplicationId && (
            <InlinePaymentFlow
              entityType="service_application"
              entityId={draftApplicationId}
              entityName={facility.title}
              customerId={facility.customer_id}
              merchantId={facility.merchant_id || ''}
              baseAmountCents={facility.amount_cents}
              initialExpanded={true}
              onPaymentSuccess={() => {
                // Invalidate sport booking queries
                queryClient.invalidateQueries({ queryKey: ['sport-bookings'] });
                queryClient.invalidateQueries({ queryKey: ['booked-time-slots'] });
                queryClient.invalidateQueries({ queryKey: ['daily-bookings'] });

                toast({
                  title: 'Booking Confirmed!',
                  description: 'Your payment was successful and your booking is confirmed.',
                });
                onClose();
                navigate('/dashboard');
              }}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 3 && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : currentStep === 2 && !facility.requires_payment ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Booking
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
