-- Ensure notification tracking columns exist
ALTER TABLE public.municipal_service_applications
ADD COLUMN IF NOT EXISTS renewal_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS renewal_reminder_count INTEGER DEFAULT 0;

-- Function to check for expiring service applications and update their status
-- Returns a list of applications that need notifications
CREATE OR REPLACE FUNCTION public.check_expiring_service_applications()
RETURNS TABLE (
  application_id UUID,
  user_id UUID,
  application_number TEXT,
  service_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_until_expiration INTEGER,
  old_status TEXT,
  new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_tile RECORD;
  v_days_until INTEGER;
  v_reminder_days INTEGER;
  v_new_status TEXT;
  v_renewal_status TEXT;
  v_changed BOOLEAN;
BEGIN
  -- Iterate through active or expiring applications that have an expiration date
  FOR v_app IN 
    SELECT 
      msa.id, 
      msa.user_id, 
      msa.application_number, 
      msa.service_name,
      msa.expires_at, 
      msa.status, 
      msa.renewal_status,
      msa.tile_id
    FROM public.municipal_service_applications msa
    WHERE msa.expires_at IS NOT NULL
      AND (
        msa.status = 'issued' 
        OR (msa.status = 'expired' AND msa.renewal_status = 'expired') -- Re-check expired ones? Maybe not necessary but good for sanity
        OR msa.renewal_status IN ('active', 'expiring_soon')
      )
  LOOP
    v_changed := false;
    v_new_status := v_app.status;
    v_renewal_status := v_app.renewal_status;
    
    -- Calculate days until expiration
    -- usage of ::date removes time component for day calculation
    v_days_until := (v_app.expires_at::date - CURRENT_DATE);
    
    -- Get renewal settings from tile
    SELECT renewal_reminder_days INTO v_tile
    FROM public.municipal_service_tiles
    WHERE id = v_app.tile_id;
    
    v_reminder_days := COALESCE(v_tile.renewal_reminder_days, 30); -- Default to 30 days
    
    -- Case 1: Already expired
    IF v_days_until < 0 THEN
      IF v_app.status != 'expired' OR v_app.renewal_status != 'expired' THEN
        v_new_status := 'expired';
        v_renewal_status := 'expired';
        v_changed := true;
      END IF;
      
    -- Case 2: Expiring soon (within window)
    ELSIF v_days_until <= v_reminder_days THEN
      IF v_app.renewal_status != 'expiring_soon' AND v_app.status != 'expired' THEN
        v_renewal_status := 'expiring_soon';
        v_changed := true;
      END IF;
    END IF;
    
    -- Update if changed
    IF v_changed THEN
      UPDATE public.municipal_service_applications
      SET 
        status = v_new_status,
        renewal_status = v_renewal_status,
        updated_at = NOW()
      WHERE id = v_app.id;
      
      -- Return row
      application_id := v_app.id;
      user_id := v_app.user_id;
      application_number := COALESCE(v_app.application_number, v_app.id::text);
      service_name := v_app.service_name;
      expires_at := v_app.expires_at;
      days_until_expiration := v_days_until;
      old_status := v_app.renewal_status; -- Track renewal status change primarily
      new_status := v_renewal_status;
      RETURN NEXT;
    END IF;
    
    -- Also return if it's already in transpiring state but we want to potentially notify again (e.g. reminders)
    -- For now, the edge function handles the daily check, so strict status change might be too limiting.
    -- However, matching the business license logic, we mainly care about status transitions OR if it's in the window.
    -- The Edge function filters by notification history (24h), so returning active expiring items is fine.
    
    IF NOT v_changed AND v_renewal_status IN ('expiring_soon', 'expired') THEN
       application_id := v_app.id;
       user_id := v_app.user_id;
       application_number := COALESCE(v_app.application_number, v_app.id::text);
       service_name := v_app.service_name;
       expires_at := v_app.expires_at;
       days_until_expiration := v_days_until;
       old_status := v_app.renewal_status;
       new_status := v_renewal_status;
       RETURN NEXT;
    END IF;
    
  END LOOP;
  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_expiring_service_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_expiring_service_applications() TO service_role;
