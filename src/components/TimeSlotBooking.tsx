import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Clock, Info, CheckCircle } from 'lucide-react';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { useBookedTimeSlots } from '@/hooks/useBookedTimeSlots';
import { format, addDays, parse, isWeekend, isSameDay } from 'date-fns';

interface TimeSlotBookingProps {
  tile: MunicipalServiceTile;
  selectedDate: Date | undefined;
  selectedTime: string | null;
  onDateSelect: (date: Date | undefined) => void;
  onTimeSelect: (time: string) => void;
}

export const TimeSlotBooking: React.FC<TimeSlotBookingProps> = ({
  tile,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
}) => {
  const config = tile.time_slot_config || {};
  const bookingMode = tile.booking_mode || 'time_period';
  
  // Format selected date for API query
  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  
  // Query booked slots for selected date
  const { data: bookedSlots = [], isLoading: loadingSlots } = useBookedTimeSlots(
    tile.id,
    dateString
  );
  
  // Generate available time slots
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    const startTime = config.start_time || '09:00';
    const endTime = config.end_time || '17:00';
    const duration = config.slot_duration_minutes || 60;
    
    // For start_time mode, use interval; for time_period, use duration
    const interval = bookingMode === 'start_time' 
      ? (config.start_time_interval_minutes || 30)
      : duration;
    
    const slots: { time: string; endTime?: string; isBooked: boolean }[] = [];
    
    const startDate = parse(startTime, 'HH:mm', new Date());
    const endDate = parse(endTime, 'HH:mm', new Date());
    
    let currentTime = startDate;
    
    while (currentTime < endDate) {
      const timeStr = format(currentTime, 'HH:mm');
      const endTimeDate = new Date(currentTime.getTime() + duration * 60000);
      const endTimeStr = bookingMode === 'time_period' ? format(endTimeDate, 'HH:mm') : undefined;
      
      // Check if this slot is booked
      const isBooked = bookedSlots.some(slot => {
        if (bookingMode === 'time_period') {
          // Check for overlap
          return slot.booking_start_time < endTimeStr! && 
                 (slot.booking_end_time || slot.booking_start_time) > timeStr;
        } else {
          // Exact match for start time
          return slot.booking_start_time === timeStr;
        }
      });
      
      slots.push({ time: timeStr, endTime: endTimeStr, isBooked });
      
      // Advance by interval (not duration)
      currentTime = new Date(currentTime.getTime() + interval * 60000);
    }
    
    return slots;
  }, [selectedDate, bookedSlots, config, bookingMode]);
  
  // Calculate max date (today + max_advance_days)
  const maxDate = useMemo(() => {
    const maxDays = config.max_advance_days || 30;
    return addDays(new Date(), maxDays);
  }, [config.max_advance_days]);
  
  // Check if date is available
  const isDateAvailable = (date: Date) => {
    const dayName = format(date, 'EEEE'); // Monday, Tuesday, etc.
    const availableDays = config.available_days || [];
    return availableDays.includes(dayName);
  };
  
  // Disable unavailable dates in calendar
  const disabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isDateAvailable(date) || date < today || date > maxDate;
  };
  
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select a date and time for your {tile.title.toLowerCase()}. 
          {bookingMode === 'time_period' 
            ? ` Each slot is ${config.slot_duration_minutes || 60} minutes.`
            : ' Select your preferred start time.'
          }
        </AlertDescription>
      </Alert>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardContent className="p-4 flex flex-col items-center">
            <Label className="flex items-center gap-2 mb-3">
              <CalendarIcon className="h-4 w-4" />
              Select Date
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              disabled={disabledDates}
              className="rounded-md border"
            />
            <div className="mt-3 text-sm text-muted-foreground">
              <p>Available: {config.available_days?.join(', ')}</p>
              <p className="mt-1">Book up to {config.max_advance_days || 30} days in advance</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Time Slots */}
        <Card>
          <CardContent className="p-4">
            <Label className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Select Time
              {loadingSlots && <span className="text-xs text-muted-foreground">(Loading...)</span>}
            </Label>
            
            {!selectedDate ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Please select a date first</p>
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No time slots available for this date</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {availableTimeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    disabled={slot.isBooked}
                    onClick={() => onTimeSelect(slot.time)}
                    className="h-auto py-3 flex flex-col items-center"
                  >
                    <span className="font-semibold">{slot.time}</span>
                    {slot.endTime && (
                      <span className="text-xs opacity-80">to {slot.endTime}</span>
                    )}
                    {slot.isBooked && (
                      <Badge variant="secondary" className="mt-1 text-xs">Booked</Badge>
                    )}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {selectedDate && selectedTime && (
        <Alert className="bg-primary/10 border-primary/20">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Selected:</strong> {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
            {bookingMode === 'time_period' && (
              <span>
                {' '}({config.slot_duration_minutes || 60} minutes)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

