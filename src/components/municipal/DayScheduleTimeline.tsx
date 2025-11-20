import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DayScheduleTimelineProps {
  bookings: any[];
  facilities: any[];
  isLoading: boolean;
  onBookingClick: (bookingId: string) => void;
  onNewBooking: (facilityId: string, startTime: string) => void;
}

export const DayScheduleTimeline: React.FC<DayScheduleTimelineProps> = ({
  bookings,
  facilities,
  isLoading,
  onBookingClick,
  onNewBooking,
}) => {
  // Calculate timeline range from facilities' operating hours
  const getTimelineRange = (facilities: any[]) => {
    let minHour = 6;
    let maxHour = 22;
    
    facilities.forEach(facility => {
      if (facility.time_slot_config?.start_time) {
        const startHour = parseInt(facility.time_slot_config.start_time.split(':')[0]);
        minHour = Math.min(minHour, startHour);
      }
      if (facility.time_slot_config?.end_time) {
        const [hourStr, minuteStr] = facility.time_slot_config.end_time.split(':');
        const endHour = parseInt(hourStr);
        const endMinute = parseInt(minuteStr);
        // If end time has minutes (e.g., 18:30), extend to next hour to show the last slot
        const adjustedEndHour = endMinute > 0 ? endHour + 1 : endHour;
        maxHour = Math.max(maxHour, adjustedEndHour);
      }
    });
    
    return { minHour, maxHour };
  };

  // Generate time slots based on facility hours
  const generateTimeSlots = (minHour: number, maxHour: number) => {
    const slots = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        slots.push(time);
        if (hour === maxHour && minute === 0) break;
      }
    }
    return slots;
  };

  const { minHour, maxHour } = getTimelineRange(facilities);
  const timeSlots = generateTimeSlots(minHour, maxHour);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getBookingPosition = (startTime: string, endTime: string | null) => {
    const startIndex = timeSlots.indexOf(startTime);
    const endIndex = endTime ? timeSlots.indexOf(endTime) : startIndex + 1;
    const height = (endIndex - startIndex) * 48; // 48px per slot
    const top = startIndex * 48;
    return { top, height: Math.max(height, 48) };
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
      <div className="flex gap-4 overflow-x-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[250px] h-[800px]" />
        ))}
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
    <div 
      className="overflow-x-auto pb-4"
      style={{
        display: 'grid',
        gridTemplateColumns: `auto repeat(${facilities.length}, minmax(250px, 1fr))`,
        gap: '1rem'
      }}
    >
      {/* Time labels column */}
      <div className="sticky left-0 bg-background z-10 pr-4">
        <div className="h-12 font-semibold">Time</div>
        {timeSlots.map((time, index) => (
          index % 2 === 0 && (
            <div key={time} className="h-12 text-sm text-muted-foreground flex items-center">
              {formatTime(time)}
            </div>
          )
        ))}
      </div>

      {/* Facility columns */}
      {facilities.map((facility) => {
        const facilityBookings = bookings.filter(b => b.tile_id === facility.id);

        return (
          <div key={facility.id}>
            <div className="h-12 font-semibold text-center border-b pb-2 mb-2">
              {facility.title}
            </div>
            <div className="relative" style={{ height: `${timeSlots.length * 48}px` }}>
              {/* Grid lines */}
              {timeSlots.map((time, index) => (
                <div
                  key={time}
                  className={cn(
                    'absolute w-full h-12 border-t border-border/50',
                    'hover:bg-muted/20 cursor-pointer transition-colors group'
                  )}
                  style={{ top: `${index * 48}px` }}
                  onClick={() => onNewBooking(facility.id, time)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}

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
                      'absolute w-full px-2 py-1 rounded border-l-4 cursor-pointer transition-all',
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
          </div>
        );
      })}
    </div>
  );
};
