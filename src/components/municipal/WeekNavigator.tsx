import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWeeklyBookings } from '@/hooks/useWeeklyBookings';
import { Skeleton } from '@/components/ui/skeleton';

interface WeekNavigatorProps {
  customerId: string | undefined;
  selectedDate: string;
  onDateChange: (date: string) => void;
  daysToShow?: number;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  customerId,
  selectedDate,
  onDateChange,
  daysToShow = 30,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Helper to get local date string (YYYY-MM-DD)
  const getLocalDateString = (date: Date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // Generate date range
  const today = new Date();
  const dates = Array.from({ length: daysToShow }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return getLocalDateString(date);
  });

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const { data: bookingCounts, isLoading } = useWeeklyBookings(customerId, startDate, endDate);

  // Auto-scroll to selected date
  useEffect(() => {
      if (scrollRef.current) {
        const selectedIndex = dates.indexOf(selectedDate);
        if (selectedIndex !== -1) {
          const cardWidth = 150; // Approximate card width + gap
          const scrollPosition = selectedIndex * cardWidth - scrollRef.current.offsetWidth / 2 + cardWidth / 2;
          scrollRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        }
      }
  }, [selectedDate, dates]);

  const getAvailabilityColor = (count: number) => {
    if (count === 0) return 'bg-green-500';
    if (count < 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return { dayName, dayNum, month };
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto p-2 -m-2 scrollbar-hide" ref={scrollRef}>
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[140px] h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto p-2 -m-2 scrollbar-hide" ref={scrollRef}>
      {dates.map((date) => {
        const { dayName, dayNum, month } = formatDate(date);
        const count = bookingCounts?.find(b => b.date === date)?.count || 0;
        const isSelected = date === selectedDate;
        const isToday = date === getLocalDateString();

        return (
          <Card
            key={date}
            className={cn(
              'min-w-[140px] p-3 cursor-pointer transition-all hover:shadow-md',
              isSelected && 'ring-2 ring-primary ring-offset-2 bg-primary/5 shadow-md'
            )}
            onClick={() => onDateChange(date)}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="text-xs text-muted-foreground font-medium">
                {dayName}
              </div>
              <div className="text-2xl font-bold">
                {dayNum}
              </div>
              <div className="text-xs text-muted-foreground">
                {month}
              </div>
              {isToday && (
                <Badge variant="secondary" className="text-xs mt-1">
                  Today
                </Badge>
              )}
              {count > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <div className={cn('h-2 w-2 rounded-full', getAvailabilityColor(count))} />
                  <span className="text-xs text-muted-foreground">
                    {count} booking{count !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
