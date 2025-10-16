-- Fix window function error in check_expiring_licenses by using CTEs
CREATE OR REPLACE FUNCTION check_expiring_licenses()
RETURNS TABLE(
  license_id UUID,
  user_id UUID,
  license_number TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_until_expiration INTEGER,
  old_status TEXT,
  new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    -- Identify all issued licenses and compute their target status
    SELECT
      bla.id,
      bla.user_id,
      bla.license_number,
      bla.expires_at,
      (EXTRACT(DAY FROM (bla.expires_at - NOW())))::INTEGER AS days_until_expiration,
      bla.renewal_status AS old_status,
      CASE
        WHEN bla.expires_at < NOW() THEN 'expired'
        WHEN bla.expires_at <= NOW() + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'active'
      END AS computed_status
    FROM public.business_license_applications bla
    WHERE
      bla.application_status = 'issued'
      AND bla.renewal_status IN ('active', 'expiring_soon', 'grace_period')
      AND bla.expires_at IS NOT NULL
  ),
  to_update AS (
    -- Filter to only licenses where status needs to change
    SELECT *
    FROM candidates
    WHERE computed_status IS DISTINCT FROM old_status
  ),
  updated AS (
    -- Perform the UPDATE using the pre-computed data
    UPDATE public.business_license_applications AS bla
    SET
      renewal_status = tu.computed_status,
      updated_at = NOW()
    FROM to_update tu
    WHERE bla.id = tu.id
    RETURNING
      bla.id AS license_id,
      bla.user_id,
      bla.license_number,
      bla.expires_at,
      tu.days_until_expiration,
      tu.old_status,
      bla.renewal_status AS new_status
  )
  SELECT * FROM updated;
END;
$$;

COMMENT ON FUNCTION check_expiring_licenses() IS 
  'Checks all issued licenses and updates their renewal_status based on expiration dates. Returns list of updated licenses. Uses CTEs to avoid window functions in RETURNING clause.';