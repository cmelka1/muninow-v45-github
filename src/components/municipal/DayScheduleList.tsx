import React from 'react';
import { BookingCard } from './BookingCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useQueryClient } from '@tanstack/react-query';
import { DailyBooking } from '@/hooks/useDailyBookings';
import { SportFacility } from '@/hooks/useSportFacilities';

interface DayScheduleListProps {
  bookings: DailyBooking[];
  facilities: SportFacility[];
  isLoading: boolean;
  onBookingClick: (bookingId: string) => void;
  onNewBooking: () => void;
}

export const DayScheduleList: React.FC<DayScheduleListProps> = ({
  bookings,
  facilities,
  isLoading,
  onBookingClick,
  onNewBooking,
}) => {
  const queryClient = useQueryClient();

  const invalidateBookingQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['sport-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['daily-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['weekly-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booked-time-slots'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">No bookings for this date</p>
          <Button onClick={onNewBooking}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Sort bookings by time
  const sortedBookings = [...bookings].sort((a, b) => 
    a.booking_start_time.localeCompare(b.booking_start_time)
  );

  return (
    <div className="space-y-3">
      {sortedBookings.map((booking) => {
        const facility = facilities.find(f => f.id === booking.tile_id);
        return (
          <BookingCard
            key={booking.id}
            booking={booking}
            facilityName={facility?.title || 'Unknown Facility'}
            viewMode="expanded"
            onClick={() => onBookingClick(booking.id)}
            onActionComplete={invalidateBookingQueries}
          />
        );
      })}
      
      <Button
        variant="outline"
        className="w-full"
        onClick={onNewBooking}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Booking
      </Button>
    </div>
  );
};
