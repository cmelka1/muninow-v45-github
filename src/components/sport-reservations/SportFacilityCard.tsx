import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, MapPin, DollarSign } from 'lucide-react';
import { SportFacility } from '@/hooks/useSportFacilities';

interface SportFacilityCardProps {
  facility: SportFacility;
  onBookNow: (facility: SportFacility) => void;
}

export function SportFacilityCard({ facility, onBookNow }: SportFacilityCardProps) {
  const config = facility.time_slot_config || {};
  
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const operatingHours = config.start_time && config.end_time
    ? `${formatTime(config.start_time)} - ${formatTime(config.end_time)}`
    : null;

  const availableDays = config.available_days || [];
  const slotDuration = config.slot_duration_minutes;

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{facility.title}</CardTitle>
          </div>
          {!facility.requires_payment && (
            <Badge variant="outline" className="text-green-600 border-green-600 shrink-0">
              Free
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {facility.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {facility.description}
          </p>
        )}

        {/* Operating Hours */}
        {operatingHours && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{operatingHours}</span>
          </div>
        )}

        {/* Available Days */}
        {availableDays.length > 0 && (
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {availableDays.map((day: string) => (
                <Badge key={day} variant="secondary" className="text-xs">
                  {day.slice(0, 3)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Slot Duration */}
        {slotDuration && (
          <div className="text-sm text-muted-foreground">
            {slotDuration >= 60 
              ? `${slotDuration / 60} hour${slotDuration > 60 ? 's' : ''} per booking`
              : `${slotDuration} minutes per booking`}
          </div>
        )}

        {/* Price */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price per booking</span>
            <span className="text-xl font-bold text-primary">
              {facility.requires_payment 
                ? formatCurrency(facility.amount_cents) 
                : 'Free'}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          onClick={() => onBookNow(facility)} 
          className="w-full"
          size="lg"
        >
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
}
