-- Upgrade renewal functions to support Smart Renewal flow (Auto-Approve vs Draft)

-- 1. Update create_license_renewal
CREATE OR REPLACE FUNCTION create_license_renewal(
  p_original_license_id UUID,
  p_auto_approve BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_license business_license_applications%ROWTYPE;
  v_renewal_license_id UUID;
  v_new_generation INTEGER;
  v_new_status business_license_status_enum;
BEGIN
  -- Get the original license
  SELECT * INTO v_original_license
  FROM business_license_applications
  WHERE id = p_original_license_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original license not found: %', p_original_license_id;
  END IF;
  
  -- Verify the license is issued and eligible for renewal
  IF v_original_license.application_status != 'issued' THEN
    RAISE EXCEPTION 'Cannot renew a license that is not issued';
  END IF;
  
  -- Only allow renewal if license is expiring soon (<=30 days) or expired
  IF v_original_license.renewal_status NOT IN ('expiring_soon', 'expired') THEN
    RAISE EXCEPTION 'License is not eligible for renewal (status: %). Renewals can only be initiated within 30 days of expiration or after expiration.', v_original_license.renewal_status;
  END IF;
  
  -- Calculate the new generation
  v_new_generation := COALESCE(v_original_license.renewal_generation, 0) + 1;
  
  -- Determine new status based on auto-approve flag
  IF p_auto_approve THEN
    v_new_status := 'approved'; -- Ready for payment
  ELSE
    v_new_status := 'draft'; -- Needs editing/review
  END IF;
  
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
    payment_status,
    approved_at
  )
  SELECT
    user_id,
    customer_id,
    merchant_id,
    license_type_id,
    v_new_status,
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
    'unpaid'::text,
    CASE WHEN p_auto_approve THEN NOW() ELSE NULL END -- Set approved_at if auto-approved
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

-- 2. Update create_service_application_renewal
CREATE OR REPLACE FUNCTION public.create_service_application_renewal(
  p_original_application_id uuid,
  p_auto_approve BOOLEAN DEFAULT FALSE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_application_id UUID;
  v_original_application RECORD;
  v_tile_record RECORD;
  v_days_until_expiration INTEGER;
  v_renewal_reminder_days INTEGER;
  v_renewal_available_date DATE;
  v_new_status TEXT;
BEGIN
  -- Get the original application details
  SELECT * INTO v_original_application
  FROM public.municipal_service_applications
  WHERE id = p_original_application_id
    AND user_id = auth.uid()
    AND status IN ('issued', 'expired');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original application not found, not issued/expired, or does not belong to you';
  END IF;
  
  -- Verify the service tile is renewable
  SELECT is_renewable, renewal_frequency, renewal_reminder_days INTO v_tile_record
  FROM public.municipal_service_tiles
  WHERE id = v_original_application.tile_id;
  
  IF v_tile_record.is_renewable = false THEN
    RAISE EXCEPTION 'This service is not renewable';
  END IF;
  
  -- Check if application has an expiration date
  IF v_original_application.expires_at IS NULL THEN
    RAISE EXCEPTION 'Application does not have an expiration date';
  END IF;
  
  -- Calculate days until expiration
  v_days_until_expiration := v_original_application.expires_at::date - CURRENT_DATE;
  
  -- Get renewal reminder days (default to 30 if not set)
  v_renewal_reminder_days := COALESCE(v_tile_record.renewal_reminder_days, 30);
  
  -- Check if within renewal window
  IF v_days_until_expiration > v_renewal_reminder_days THEN
    v_renewal_available_date := v_original_application.expires_at::date - (v_renewal_reminder_days || ' days')::INTERVAL;
    RAISE EXCEPTION 'Renewal not yet available. You can renew starting on % (% days before expiration)', 
      v_renewal_available_date, v_renewal_reminder_days;
  END IF;

  -- Determine new status based on auto-approve flag
  IF p_auto_approve THEN
    v_new_status := 'approved';
  ELSE
    v_new_status := 'draft';
  END IF;
  
  -- Create the renewal application
  INSERT INTO public.municipal_service_applications (
    user_id,
    customer_id,
    tile_id,
    merchant_id,
    status,
    approved_at,
    assigned_reviewer_id,
    applicant_name,
    applicant_email,
    applicant_phone,
    business_legal_name,
    street_address,
    apt_number,
    city,
    state,
    zip_code,
    country,
    base_amount_cents,
    service_specific_data,
    additional_information,
    is_renewal,
    parent_application_id,
    renewal_generation,
    original_issue_date,
    service_name,
    merchant_name,
    finix_merchant_id,
    merchant_finix_identity_id,
    merchant_fee_profile_id
  ) VALUES (
    v_original_application.user_id,
    v_original_application.customer_id,
    v_original_application.tile_id,
    v_original_application.merchant_id,
    v_new_status,
    CASE WHEN p_auto_approve THEN NOW() ELSE NULL END,
    v_original_application.assigned_reviewer_id,
    v_original_application.applicant_name,
    v_original_application.applicant_email,
    v_original_application.applicant_phone,
    v_original_application.business_legal_name,
    v_original_application.street_address,
    v_original_application.apt_number,
    v_original_application.city,
    v_original_application.state,
    v_original_application.zip_code,
    v_original_application.country,
    v_original_application.base_amount_cents,
    v_original_application.service_specific_data,
    v_original_application.additional_information,
    true,
    p_original_application_id,
    COALESCE(v_original_application.renewal_generation, 0) + 1,
    COALESCE(v_original_application.original_issue_date, v_original_application.issued_at),
    v_original_application.service_name,
    v_original_application.merchant_name,
    v_original_application.finix_merchant_id,
    v_original_application.merchant_finix_identity_id,
    v_original_application.merchant_fee_profile_id
  )
  RETURNING id INTO v_new_application_id;
  
  -- Record the renewal in history table
  INSERT INTO public.service_application_renewal_history (
    original_application_id,
    renewed_application_id,
    renewal_generation,
    renewed_by
  ) VALUES (
    p_original_application_id,
    v_new_application_id,
    COALESCE(v_original_application.renewal_generation, 0) + 1,
    auth.uid()
  );
  
  RETURN v_new_application_id;
END;
$function$;
