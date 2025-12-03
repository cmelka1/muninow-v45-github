import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SportBooking {
  id: string;
  tile_id: string;
  user_id: string;
  customer_id: string;
  status: string;
  payment_status: string | null;
  booking_date: string;
  booking_start_time: string;
  booking_end_time: string | null;
  booking_timezone: string;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  service_name: string | null;
  base_amount_cents: number | null;
  total_amount_cents: number | null;
  service_specific_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined facility data
  facility?: {
    id: string;
    title: string;
    time_slot_config: Record<string, any>;
  };
}

export const useSportBookings = (customerId?: string) => {
  return useQuery({
    queryKey: ['sport-bookings', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      // First get all sport facility IDs for this customer
      const { data: facilities, error: facilitiesError } = await supabase
        .from('municipal_service_tiles')
        .select('id, title, time_slot_config')
        .eq('customer_id', customerId)
        .eq('has_time_slots', true);

      if (facilitiesError) throw facilitiesError;
      if (!facilities || facilities.length === 0) return [];

      const facilityIds = facilities.map(f => f.id);
      const facilityMap = new Map(facilities.map(f => [f.id, f]));

      // Fetch bookings for these facilities
      const { data: bookings, error: bookingsError } = await supabase
        .from('municipal_service_applications')
        .select('*')
        .in('tile_id', facilityIds)
        .not('status', 'eq', 'draft')
        .order('booking_date', { ascending: false })
        .order('booking_start_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Attach facility data to each booking
      return (bookings || []).map(booking => ({
        ...booking,
        facility: facilityMap.get(booking.tile_id),
      })) as SportBooking[];
    },
    enabled: !!customerId,
  });
};

export const useUpcomingSportBookings = (customerId?: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['upcoming-sport-bookings', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data: facilities } = await supabase
        .from('municipal_service_tiles')
        .select('id, title, time_slot_config')
        .eq('customer_id', customerId)
        .eq('has_time_slots', true);

      if (!facilities || facilities.length === 0) return [];

      const facilityIds = facilities.map(f => f.id);
      const facilityMap = new Map(facilities.map(f => [f.id, f]));

      const { data: bookings, error } = await supabase
        .from('municipal_service_applications')
        .select('*')
        .in('tile_id', facilityIds)
        .gte('booking_date', today)
        .not('status', 'in', '(draft,cancelled,expired,denied)')
        .order('booking_date', { ascending: true })
        .order('booking_start_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      return (bookings || []).map(booking => ({
        ...booking,
        facility: facilityMap.get(booking.tile_id),
      })) as SportBooking[];
    },
    enabled: !!customerId,
  });
};

export const useTodaySportBookings = (customerId?: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['today-sport-bookings', customerId, today],
    queryFn: async () => {
      if (!customerId) return [];

      const { data: facilities } = await supabase
        .from('municipal_service_tiles')
        .select('id, title, time_slot_config')
        .eq('customer_id', customerId)
        .eq('has_time_slots', true);

      if (!facilities || facilities.length === 0) return [];

      const facilityIds = facilities.map(f => f.id);
      const facilityMap = new Map(facilities.map(f => [f.id, f]));

      const { data: bookings, error } = await supabase
        .from('municipal_service_applications')
        .select('*')
        .in('tile_id', facilityIds)
        .eq('booking_date', today)
        .not('status', 'in', '(draft,cancelled,expired)')
        .order('booking_start_time', { ascending: true });

      if (error) throw error;

      return (bookings || []).map(booking => ({
        ...booking,
        facility: facilityMap.get(booking.tile_id),
      })) as SportBooking[];
    },
    enabled: !!customerId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
};

export const useUpdateSportBookingStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      status, 
      denialReason 
    }: { 
      bookingId: string; 
      status: string; 
      denialReason?: string;
    }) => {
      const updateData: Record<string, any> = { status };
      
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'denied') {
        updateData.denied_at = new Date().toISOString();
        if (denialReason) {
          updateData.denial_reason = denialReason;
        }
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('municipal_service_applications')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['today-sport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['daily-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-time-slots'] });
      queryClient.invalidateQueries({ queryKey: ['conflict-check'] });
      toast({
        title: 'Success',
        description: 'Booking status updated',
      });
    },
    onError: (error) => {
      console.error('Error updating booking status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update booking status',
        variant: 'destructive',
      });
    },
  });
};

export const useCancelSportBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      cancelledBy,
      cancellationReason 
    }: { 
      bookingId: string; 
      cancelledBy: string;
      cancellationReason?: string;
    }) => {
      const { data, error } = await supabase
        .from('municipal_service_applications')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancellation_reason: cancellationReason,
        })
        .eq('id', bookingId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['today-sport-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['daily-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-time-slots'] });
      queryClient.invalidateQueries({ queryKey: ['conflict-check'] });
      toast({
        title: 'Booking Cancelled',
        description: 'The booking has been cancelled successfully',
      });
    },
    onError: (error) => {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
    },
  });
};
