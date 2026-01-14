-- Backend Logic for Building Permit Renewals

-- 1. Trigger to calculate permit expiration on issuance
CREATE OR REPLACE FUNCTION calculate_permit_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_validity_days INTEGER;
BEGIN
  -- Only calculate if status changed to 'issued' and expires_at is not already set
  IF NEW.application_status = 'issued' AND (OLD.application_status IS DISTINCT FROM 'issued') AND NEW.expires_at IS NULL THEN
    
    -- Get validity duration from permit type
    SELECT validity_duration_days INTO v_validity_days
    FROM permit_types_v2
    WHERE id = NEW.permit_type_id;
    
    -- Default to 365 days if not set
    v_validity_days := COALESCE(v_validity_days, 365);
    
    -- Set expiration date
    NEW.expires_at := NOW() + (v_validity_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_permit_expiration ON permit_applications;
CREATE TRIGGER trigger_calculate_permit_expiration
BEFORE UPDATE ON permit_applications
FOR EACH ROW
EXECUTE FUNCTION calculate_permit_expiration();


-- 2. RPC to create a permit renewal application
CREATE OR REPLACE FUNCTION create_permit_renewal(
  p_original_permit_id UUID,
  p_auto_approve BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_permit RECORD;
  v_new_permit_id UUID;
  v_permit_type RECORD;
  v_new_status TEXT;
  v_days_until_expiration INTEGER;
  v_renewal_reminder_days INTEGER;
BEGIN
  -- Get original permit
  SELECT * INTO v_original_permit
  FROM permit_applications
  WHERE permit_id = p_original_permit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original permit not found: %', p_original_permit_id;
  END IF;

  -- Verify permit is renewable (check type settings)
  SELECT * INTO v_permit_type
  FROM permit_types_v2
  WHERE id = v_original_permit.permit_type_id;

  IF v_permit_type.is_renewable = false THEN
    RAISE EXCEPTION 'This permit type is not renewable';
  END IF;

  -- detailed eligibility check
  IF v_original_permit.application_status = 'expired' THEN
     -- Allowed
     NULL;
  ELSIF v_original_permit.application_status = 'issued' THEN
     -- Check if within renewal window
     IF v_original_permit.expires_at IS NOT NULL THEN
       v_days_until_expiration := EXTRACT(DAY FROM (v_original_permit.expires_at - NOW()));
       v_renewal_reminder_days := COALESCE(v_permit_type.renewal_reminder_days, 30);
       
       IF v_days_until_expiration > v_renewal_reminder_days THEN
         RAISE EXCEPTION 'Renewal not yet available. Within % days of expiration required.', v_renewal_reminder_days;
       END IF;
     ELSE
       -- If no expiration date (legacy), allow renewal? Or assume it's old enough?
       -- For now, allow if issued.
       NULL;
     END IF;
  ELSE
     RAISE EXCEPTION 'Permit must be Issued or Expired to be renewed.';
  END IF;

  -- Determine new status
  IF p_auto_approve THEN
    v_new_status := 'approved';
  ELSE
    v_new_status := 'draft';
  END IF;

  -- Create new permit application (copying relevant fields)
  INSERT INTO permit_applications (
    user_id,
    customer_id, -- municipality
    merchant_id,
    permit_type_id,
    
    -- Property Info
    property_address,
    property_pin,
    
    -- Applicant Info
    applicant_full_name,
    applicant_phone,
    applicant_email,
    applicant_address,
    
    -- Owner Info
    owner_full_name,
    owner_phone,
    owner_email,
    owner_address,
    
    -- Project Info
    estimated_construction_value_cents,
    scope_of_work, -- Description
    
    -- Payment/Fee info (reset to new calculation usually, but we copy merchant profiles)
    merchant_name,
    finix_merchant_id,
    merchant_finix_identity_id,
    merchant_fee_profile_id, -- Keep same profile? Or fetch new? Keeping same for now.
    
    -- Status
    application_status,
    payment_status,
    payment_amount_cents,
    
    -- Renewal Metadata
    is_renewal,
    original_permit_id,
    renewal_generation,
    created_at,
    updated_at
  )
  VALUES (
    v_original_permit.user_id,
    v_original_permit.customer_id,
    v_original_permit.merchant_id,
    v_original_permit.permit_type_id,
    
    v_original_permit.property_address,
    v_original_permit.property_pin,
    
    v_original_permit.applicant_full_name,
    v_original_permit.applicant_phone,
    v_original_permit.applicant_email,
    v_original_permit.applicant_address,
    
    v_original_permit.owner_full_name,
    v_original_permit.owner_phone,
    v_original_permit.owner_email,
    v_original_permit.owner_address,
    
    v_original_permit.estimated_construction_value_cents,
    v_original_permit.scope_of_work,
    
    v_original_permit.merchant_name,
    v_original_permit.finix_merchant_id,
    v_original_permit.merchant_finix_identity_id,
    v_original_permit.merchant_fee_profile_id,
    
    v_new_status,
    'unpaid',
    
    -- Fee logic: use renewal fee if configured, otherwise falls back to 0
    COALESCE(v_permit_type.renewal_fee_cents, 0),
    
    true, -- is_renewal
    p_original_permit_id,
    COALESCE(v_original_permit.renewal_generation, 0) + 1,
    NOW(),
    NOW()
  )
  RETURNING permit_id INTO v_new_permit_id;

  -- Copy Contractors
  INSERT INTO permit_contractors (
    permit_id,
    contractor_type,
    contractor_name,
    contractor_phone,
    contractor_email,
    contractor_address
  )
  SELECT
    v_new_permit_id,
    contractor_type,
    contractor_name,
    contractor_phone,
    contractor_email,
    contractor_address
  FROM permit_contractors
  WHERE permit_id = p_original_permit_id;

  -- Record History
  INSERT INTO permit_renewal_history (
    original_permit_id,
    renewed_permit_id,
    renewal_generation,
    renewed_by
  )
  VALUES (
    p_original_permit_id,
    v_new_permit_id,
    COALESCE(v_original_permit.renewal_generation, 0) + 1,
    auth.uid()
  );
  
  -- Update original permit renewal status
  UPDATE permit_applications
  SET renewal_status = 'renewed'
  WHERE permit_id = p_original_permit_id;

  RETURN v_new_permit_id;
END;
$$;


-- 3. Check and update expiring permits status
CREATE OR REPLACE FUNCTION check_expiring_permits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark permits as 'expiring_soon' if within window (and not already notified/marked)
  -- This creates a side effect we can listen to or just use for UI badges
  UPDATE permit_applications pa
  SET renewal_status = 'expiring_soon'
  FROM permit_types_v2 pt
  WHERE pa.permit_type_id = pt.id
    AND pa.application_status = 'issued'
    AND pa.renewal_status IS NULL
    AND pa.expires_at IS NOT NULL
    AND pa.expires_at <= (NOW() + (COALESCE(pt.renewal_reminder_days, 30) || ' days')::INTERVAL);

  -- Mark expired permits
  UPDATE permit_applications
  SET 
    application_status = 'expired',
    renewal_status = 'expired'
  WHERE 
    application_status = 'issued'
    AND expires_at < NOW();
    
END;
$$;
