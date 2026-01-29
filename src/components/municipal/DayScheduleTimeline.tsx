import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MunicipalServiceTile } from '@/hooks/useMunicipalServiceTiles';
import { DailyBooking } from '@/hooks/useDailyBookings';

interface DayScheduleTimelineProps {
  bookings: DailyBooking[];
  facilities: MunicipalServiceTile[];
  isLoading: boolean;
  selectedDate: string;
  onBookingClick: (bookingId: string) => void;
  onNewBooking: (facilityId: string, startTime: string) => void;
}

export const DayScheduleTimeline: React.FC<DayScheduleTimelineProps> = ({
  bookings,
  facilities,
  isLoading,
  selectedDate,
  onBookingClick,
  onNewBooking,
}) => {
  // Calculate the smallest interval across all facilities to use as base grid
  const baseInterval = useMemo(() => {
    // Get intervals from start_time mode facilities
    const startTimeIntervals = facilities
      .filter(f => f.booking_mode === 'start_time')
      .map(f => f.time_slot_config?.start_time_interval_minutes || 30);
    
    // Get intervals from time_period mode facilities (use slot_duration)
    const timePeriodIntervals = facilities
      .filter(f => f.booking_mode === 'time_period' || !f.booking_mode)
      .map(f => f.time_slot_config?.slot_duration_minutes || 60);
    
    const allIntervals = [...startTimeIntervals, ...timePeriodIntervals];
    
    // Use smallest interval as base grid (no artificial cap)
    return allIntervals.length > 0 ? Math.min(...allIntervals) : 30;
  }, [facilities]);

  // Calculate dynamic slot height based on interval
  const slotHeight = baseInterval <= 15 ? 24 : baseInterval <= 30 ? 48 : 96;

  // Check if a time is valid for a specific facility's interval
  const isValidIntervalForFacility = (time: string, facility: MunicipalServiceTile) => {
    const [hours, minutes] = time.split(':').map(Number);
    
    // Get the facility's specific interval
    const facilityInterval = facility.booking_mode === 'start_time'
      ? (facility.time_slot_config?.start_time_interval_minutes || 30)
      : (facility.time_slot_config?.slot_duration_minutes || 60);
    
    // Check if minutes are divisible by the facility's interval
    return minutes % facilityInterval === 0;
  };

  // Calculate earliest start and latest end times across all facilities
  const operatingHours = useMemo(() => {
    let earliestStart = '23:59';
    let latestEnd = '00:00';
    
    facilities.forEach(facility => {
      const config = facility.time_slot_config || {};
      const start = config.start_time || '06:00';
      const end = config.end_time || '22:00';
      
      if (start < earliestStart) earliestStart = start;
      if (end > latestEnd) latestEnd = end;
    });
    
    // Add 1 hour buffer on each side for visibility
    const [startHour] = earliestStart.split(':').map(Number);
    const [endHour] = latestEnd.split(':').map(Number);
    
    return {
      startHour: Math.max(0, startHour - 1),
      endHour: Math.min(24, endHour + 1),
    };
  }, [facilities]);

  // Generate time slots based on dynamic interval - only for operating hours
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = operatingHours.startHour; hour < operatingHours.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += baseInterval) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), [operatingHours, baseInterval]);

  // Check if a slot is available based on facility operating hours and day-of-week
  const isSlotAvailable = (time: string, facility: MunicipalServiceTile) => {
    const config = facility.time_slot_config || {};
    
    // Check day-of-week availability
    const dayName = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    const availableDays = config.available_days || [];
    if (availableDays.length > 0 && !availableDays.includes(dayName)) {
      return false; // Facility closed this day
    }
    
    // Check time-of-day availability
    const facilityStart = config.start_time || '00:00';
    const facilityEnd = config.end_time || '23:59';
    const slotTime = time.slice(0, 5); // "06:00:00" → "06:00"
    
    return slotTime >= facilityStart && slotTime < facilityEnd;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getBookingPosition = (startTime: string, endTime: string | null) => {
    // Calculate position based on dynamic interval, accounting for grid start offset
    const slotsPerHour = 60 / baseInterval;
    const [startHour, startMin] = startTime.split(':').map(Number);
    
    // Subtract operatingHours.startHour to get position relative to grid start
    const gridOffsetSlots = operatingHours.startHour * slotsPerHour;
    let startIndex = (startHour * slotsPerHour + Math.floor(startMin / baseInterval)) - gridOffsetSlots;
    
    let endIndex = startIndex + 1; // Default to 1 slot
    if (endTime) {
      const [endHour, endMin] = endTime.split(':').map(Number);
      endIndex = (endHour * slotsPerHour + Math.floor(endMin / baseInterval)) - gridOffsetSlots;
    }
    
    // Clamp to grid bounds (handle bookings before/after visible range)
    const maxSlots = timeSlots.length;
    startIndex = Math.max(0, Math.min(startIndex, maxSlots - 1));
    endIndex = Math.max(startIndex + 1, Math.min(endIndex, maxSlots));
    
    const height = (endIndex - startIndex) * slotHeight;
    const top = startIndex * slotHeight;
    return { top, height: Math.max(height, slotHeight) };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 border-green-500 hover:bg-green-200';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 border-yellow-500 hover:bg-yellow-200';
      case 'issued':
        return 'bg-blue-100 border-blue-500 hover:bg-blue-200';
      case 'denied':
      case 'rejected':
        return 'bg-red-100 border-red-500 hover:bg-red-200';
      default:
        return 'bg-gray-100 border-gray-500 hover:bg-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="flex gap-4 border-b pb-2 mb-2">
          <Skeleton className="w-20 h-6" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-6" />
          ))}
        </div>
        <Skeleton className="w-full h-[500px]" />
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No sport facilities configured</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Fixed Header Row - Facility Names */}
      <div 
        className="flex border-b pb-2 mb-2"
        style={{
          display: 'grid',
          gridTemplateColumns: `80px repeat(${facilities.length}, minmax(250px, 1fr))`,
          gap: '1rem'
        }}
      >
        <div className="font-semibold text-sm">Time</div>
        {facilities.map((facility) => (
          <div key={facility.id} className="font-semibold text-center text-sm">
            {facility.title}
          </div>
        ))}
      </div>

      {/* Scrollable Timeline Body */}
      <ScrollArea className="h-[500px] w-full rounded-md border">
        <div 
          className="overflow-x-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: `80px repeat(${facilities.length}, minmax(250px, 1fr))`,
            gap: '1rem'
          }}
        >
          {/* Time labels column */}
          <div className="sticky left-0 bg-background z-10 pr-4">
            {timeSlots.map((time) => (
              time.endsWith(':00:00') && (
                <div key={time} style={{ height: `${slotHeight * (60 / baseInterval)}px` }} className="text-sm text-muted-foreground flex items-start pt-1">
                  {formatTime(time)}
                </div>
              )
            ))}
          </div>

          {/* Facility columns */}
          {facilities.map((facility) => {
            const facilityBookings = bookings.filter(b => b.tile_id === facility.id);

            return (
              <div key={facility.id} className="relative" style={{ height: `${timeSlots.length * slotHeight}px` }}>
                {/* Grid lines with availability-aware styling */}
                {timeSlots.map((time, index) => {
                  const isAvailable = isSlotAvailable(time, facility);
                  const isValidInterval = isValidIntervalForFacility(time, facility);
                  const canBook = isAvailable && isValidInterval;
                  
                  return (
                    <div
                      key={time}
                      className={cn(
                        'absolute w-full border-t border-border/50 transition-colors',
                        canBook 
                          ? 'bg-gray-100 hover:bg-gray-200 cursor-pointer group' 
                          : isAvailable && !isValidInterval
                            ? 'bg-gray-50/50 cursor-default'  // Available but not valid interval
                            : 'bg-gray-300 cursor-not-allowed'  // Closed hours
                      )}
                      style={{ top: `${index * slotHeight}px`, height: `${slotHeight}px` }}
                      onClick={canBook ? () => onNewBooking(facility.id, time) : undefined}
                    >
                      {canBook && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}

                {/* Booking blocks */}
                {facilityBookings.map((booking) => {
                  const { top, height } = getBookingPosition(
                    booking.booking_start_time,
                    booking.booking_end_time
                  );
                  const applicantName = booking.applicant_name || 'Unknown';

                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        'absolute w-full px-2 py-1 rounded border-l-4 cursor-pointer transition-all z-10',
                        getStatusColor(booking.status)
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={() => onBookingClick(booking.id)}
                    >
                      <div className="text-xs font-medium truncate">
                        {formatTime(booking.booking_start_time)}
                      </div>
                      <div className="text-xs truncate">{applicantName}</div>
                      <div className="text-xs text-muted-foreground truncate capitalize">
                        {booking.status.replace('_', ' ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
