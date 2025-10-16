-- Fix ambiguous column reference in check_expiring_licenses function
CREATE OR REPLACE FUNCTION public.check_expiring_licenses()
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
    SELECT *
    FROM candidates c
    WHERE c.computed_status IS DISTINCT FROM c.old_status
  ),
  updated AS (
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

COMMENT ON FUNCTION public.check_expiring_licenses() IS 
  'Checks all issued licenses and updates their renewal_status based on expiration dates. Returns list of updated licenses. Uses explicit column qualification to avoid ambiguity with OUT parameters.';