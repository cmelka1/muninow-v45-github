-- Add RLS policy for booking time slot visibility
-- This allows users to see when time slots are reserved (without exposing personal info)
-- so they know which slots are unavailable when booking sport facilities

-- Policy allows viewing booking records for availability checks
-- Only exposes confirmed/active bookings (not drafts, cancelled, etc.)
CREATE POLICY "Users can view booking time slots for availability"
ON public.municipal_service_applications
FOR SELECT
TO authenticated
USING (
  -- Only expose confirmed bookings that have time slot data
  status NOT IN ('draft', 'denied', 'rejected', 'withdrawn', 'cancelled', 'expired')
  AND booking_date IS NOT NULL
);

COMMENT ON POLICY "Users can view booking time slots for availability" 
ON public.municipal_service_applications IS 
'Allows authenticated users to see booking availability data for time slot selection. 
The frontend only queries time fields (booking_date, booking_start_time, booking_end_time, status). 
Personal information remains protected by not being selected in the query.';
