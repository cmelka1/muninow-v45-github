-- Fix draft booking conflicts in RPC function and database index
-- This ensures draft applications don't block time slot reservations

-- Update the create_booking_with_conflict_check function to exclude 'draft' from conflicts
CREATE OR REPLACE FUNCTION public.create_booking_with_conflict_check(
  p_application_id uuid DEFAULT NULL::uuid,
  p_tile_id uuid DEFAULT NULL::uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_customer_id uuid DEFAULT NULL::uuid,
  p_booking_date date DEFAULT NULL::date,
  p_booking_start_time time without time zone DEFAULT NULL::time without time zone,
  p_booking_end_time time without time zone DEFAULT NULL::time without time zone,
  p_booking_timezone text DEFAULT NULL::text,
  p_form_data jsonb DEFAULT NULL::jsonb,
  p_amount_cents bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_application_id UUID;
  v_has_conflict BOOLEAN;
  v_application_number TEXT;
  v_existing_app RECORD;
BEGIN
  -- Lock the tile row to prevent concurrent bookings
  PERFORM 1 FROM public.municipal_service_tiles
  WHERE id = p_tile_id
  FOR UPDATE;
  
  -- Check for booking conflicts (FIXED: now excludes 'draft' status)
  SELECT EXISTS (
    SELECT 1 
    FROM public.municipal_service_applications
    WHERE tile_id = p_tile_id
      AND booking_date = p_booking_date
      AND status NOT IN ('draft', 'denied', 'rejected', 'withdrawn', 'cancelled', 'expired')
      AND (p_application_id IS NULL OR id != p_application_id)  -- Exclude current draft
      AND (
        -- Time period overlap check
        (p_booking_end_time IS NOT NULL AND booking_end_time IS NOT NULL AND
         p_booking_start_time < booking_end_time AND p_booking_end_time > booking_start_time)
        OR
        -- Start time exact match check
        (p_booking_end_time IS NULL AND booking_end_time IS NULL AND
         p_booking_start_time = booking_start_time)
      )
  ) INTO v_has_conflict;
  
  IF v_has_conflict THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'conflict',
      'message', 'This time slot is no longer available. Please select a different time.'
    );
  END IF;
  
  -- If application_id provided, UPDATE existing draft
  IF p_application_id IS NOT NULL THEN
    -- Verify the application exists and is a draft
    SELECT * INTO v_existing_app
    FROM public.municipal_service_applications
    WHERE id = p_application_id AND status = 'draft';
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'not_found',
        'message', 'Draft application not found or already submitted.'
      );
    END IF;
    
    -- Update the existing draft with booking details
    UPDATE public.municipal_service_applications
    SET
      form_data = p_form_data,
      amount_cents = p_amount_cents,
      booking_date = p_booking_date,
      booking_start_time = p_booking_start_time,
      booking_end_time = p_booking_end_time,
      booking_timezone = p_booking_timezone,
      payment_status = CASE 
        WHEN p_amount_cents > 0 THEN 'unpaid'
        ELSE 'not_required'
      END,
      updated_at = now()
    WHERE id = p_application_id;
    
    v_application_id := p_application_id;
    v_application_number := v_existing_app.application_number;
  ELSE
    -- Generate application number for new application
    v_application_number := generate_service_application_number();
    
    -- Create NEW application as draft (not submitted)
    INSERT INTO public.municipal_service_applications (
      tile_id,
      user_id,
      customer_id,
      application_number,
      form_data,
      amount_cents,
      status,
      payment_status,
      booking_date,
      booking_start_time,
      booking_end_time,
      booking_timezone
    ) VALUES (
      p_tile_id,
      p_user_id,
      p_customer_id,
      v_application_number,
      p_form_data,
      p_amount_cents,
      'draft',
      CASE 
        WHEN p_amount_cents > 0 THEN 'unpaid'
        ELSE 'not_required'
      END,
      p_booking_date,
      p_booking_start_time,
      p_booking_end_time,
      p_booking_timezone
    )
    RETURNING id INTO v_application_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'application_number', v_application_number
  );
END;
$function$;

-- Update database index to exclude 'draft' for consistency
DROP INDEX IF EXISTS public.idx_service_applications_booking_lookup;

CREATE INDEX idx_service_applications_booking_lookup 
ON public.municipal_service_applications(tile_id, booking_date, status)
WHERE booking_date IS NOT NULL 
  AND status NOT IN ('draft', 'denied', 'rejected', 'withdrawn', 'cancelled', 'expired');

COMMENT ON INDEX public.idx_service_applications_booking_lookup IS 
  'Optimized lookup for time slot availability - excludes draft and inactive statuses';