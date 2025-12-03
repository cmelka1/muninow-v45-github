import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DayBookingCount {
  date: string;
  count: number;
}

export const useWeeklyBookings = (customerId: string | undefined, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['weekly-bookings', customerId, startDate, endDate],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID required');

      // First get sport facility IDs
      const { data: tiles } = await supabase
        .from('municipal_service_tiles')
        .select('id')
        .eq('customer_id', customerId)
        .eq('has_time_slots', true)
        .eq('is_active', true);

      if (!tiles || tiles.length === 0) return [];

      const tileIds = tiles.map(t => t.id);

      // Fetch booking counts grouped by date
      const { data, error } = await supabase
        .from('municipal_service_applications')
        .select('booking_date')
        .in('tile_id', tileIds)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .not('status', 'in', '(draft,cancelled,expired)');

      if (error) throw error;

      // Group by date and count
      const countMap = new Map<string, number>();
      data?.forEach(booking => {
        const date = booking.booking_date;
        countMap.set(date, (countMap.get(date) || 0) + 1);
      });

      // Helper to get local date string (YYYY-MM-DD)
      const getLocalDateString = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };

      // Convert to array using local dates
      const result: DayBookingCount[] = [];
      const start = new Date(startDate + 'T12:00:00'); // Use noon to avoid timezone edge cases
      const end = new Date(endDate + 'T12:00:00');
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = getLocalDateString(d);
        result.push({
          date: dateStr,
          count: countMap.get(dateStr) || 0,
        });
      }

      return result;
    },
    enabled: !!customerId && !!startDate && !!endDate,
  });
};
