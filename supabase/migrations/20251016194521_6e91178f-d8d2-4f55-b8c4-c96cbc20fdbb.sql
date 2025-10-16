-- Phase 2: Business License Renewal - Backend Functions

-- 1. Function to create a renewal license application
CREATE OR REPLACE FUNCTION create_license_renewal(p_original_license_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_license business_license_applications%ROWTYPE;
  v_renewal_license_id UUID;
  v_new_generation INTEGER;
BEGIN
  -- Get the original license
  SELECT * INTO v_original_license
  FROM business_license_applications
  WHERE id = p_original_license_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original license not found: %', p_original_license_id;
  END IF;
  
  -- Verify the license is issued and active/expiring
  IF v_original_license.application_status != 'issued' THEN
    RAISE EXCEPTION 'Cannot renew a license that is not issued';
  END IF;
  
  IF v_original_license.renewal_status NOT IN ('active', 'expiring_soon') THEN
    RAISE EXCEPTION 'License is not eligible for renewal (status: %)', v_original_license.renewal_status;
  END IF;
  
  -- Calculate the new generation
  v_new_generation := COALESCE(v_original_license.renewal_generation, 0) + 1;
  
  -- Create the renewal license application
  INSERT INTO business_license_applications (
    user_id,
    customer_id,
    merchant_id,
    license_type_id,
    application_status,
    business_legal_name,
    doing_business_as,
    business_type,
    business_description,
    federal_ein,
    state_tax_id,
    business_street_address,
    business_apt_number,
    business_city,
    business_state,
    business_zip_code,
    business_country,
    business_phone,
    business_email,
    owner_first_name,
    owner_last_name,
    owner_title,
    owner_phone,
    owner_email,
    owner_street_address,
    owner_apt_number,
    owner_city,
    owner_state,
    owner_zip_code,
    owner_country,
    base_amount_cents,
    merchant_name,
    is_renewal,
    parent_license_id,
    renewal_generation,
    original_issue_date,
    payment_status
  )
  SELECT
    user_id,
    customer_id,
    merchant_id,
    license_type_id,
    'draft'::business_license_status_enum,
    business_legal_name,
    doing_business_as,
    business_type,
    business_description,
    federal_ein,
    state_tax_id,
    business_street_address,
    business_apt_number,
    business_city,
    business_state,
    business_zip_code,
    business_country,
    business_phone,
    business_email,
    owner_first_name,
    owner_last_name,
    owner_title,
    owner_phone,
    owner_email,
    owner_street_address,
    owner_apt_number,
    owner_city,
    owner_state,
    owner_zip_code,
    owner_country,
    base_amount_cents,
    merchant_name,
    true, -- is_renewal
    p_original_license_id, -- parent_license_id
    v_new_generation,
    COALESCE(v_original_license.original_issue_date, v_original_license.issued_at, v_original_license.approved_at),
    'unpaid'::text
  FROM business_license_applications
  WHERE id = p_original_license_id
  RETURNING id INTO v_renewal_license_id;
  
  -- Log the renewal in history
  INSERT INTO business_license_renewal_history (
    original_license_id,
    renewed_license_id,
    renewal_generation,
    renewed_by
  )
  VALUES (
    p_original_license_id,
    v_renewal_license_id,
    v_new_generation,
    auth.uid()
  );
  
  -- Mark the original license as renewed
  UPDATE business_license_applications
  SET renewal_status = 'renewed'
  WHERE id = p_original_license_id;
  
  RETURN v_renewal_license_id;
END;
$$;

-- 2. Function to check and update expiring licenses
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
  WITH updated_licenses AS (
    UPDATE business_license_applications
    SET 
      renewal_status = CASE
        -- Expired (past expiration date)
        WHEN expires_at < NOW() THEN 'expired'
        -- Expiring soon (30 days or less)
        WHEN expires_at <= NOW() + INTERVAL '30 days' THEN 'expiring_soon'
        -- Active (more than 30 days)
        ELSE 'active'
      END,
      updated_at = NOW()
    WHERE 
      application_status = 'issued'
      AND renewal_status IN ('active', 'expiring_soon', 'grace_period')
      AND expires_at IS NOT NULL
      AND (
        -- Status needs to be updated
        (expires_at < NOW() AND renewal_status != 'expired')
        OR (expires_at <= NOW() + INTERVAL '30 days' AND expires_at >= NOW() AND renewal_status != 'expiring_soon')
        OR (expires_at > NOW() + INTERVAL '30 days' AND renewal_status != 'active')
      )
    RETURNING 
      id,
      business_license_applications.user_id,
      license_number,
      expires_at,
      EXTRACT(DAY FROM (expires_at - NOW()))::INTEGER as days_until_expiration,
      LAG(renewal_status) OVER (PARTITION BY id ORDER BY updated_at) as old_status,
      renewal_status as new_status
  )
  SELECT * FROM updated_licenses;
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION create_license_renewal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_expiring_licenses() TO service_role;

-- 4. Add helpful comments
COMMENT ON FUNCTION create_license_renewal(UUID) IS 
  'Creates a renewal application for an issued business license. Copies data from original license and sets up renewal tracking.';

COMMENT ON FUNCTION check_expiring_licenses() IS 
  'Checks all issued licenses and updates their renewal_status based on expiration dates. Returns list of updated licenses.';