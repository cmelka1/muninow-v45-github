-- Phase 1: Unified Database Layer
-- Helper function to get merchant fee profile with fallbacks
CREATE OR REPLACE FUNCTION public.get_merchant_fee_profile(p_merchant_id uuid)
RETURNS TABLE(
  basis_points integer,
  fixed_fee integer,
  ach_basis_points integer,
  ach_fixed_fee integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to get merchant-specific fee profile
  RETURN QUERY
  SELECT 
    COALESCE(mfp.basis_points, 300) as basis_points,
    COALESCE(mfp.fixed_fee, 50) as fixed_fee,
    COALESCE(mfp.ach_basis_points, 150) as ach_basis_points,
    COALESCE(mfp.ach_fixed_fee, 50) as ach_fixed_fee
  FROM public.merchant_fee_profiles mfp
  WHERE mfp.merchant_id = p_merchant_id
  UNION ALL
  SELECT 300, 50, 150, 50  -- Fallback defaults
  LIMIT 1;
END;
$$;

-- Helper function to calculate unified service fee
CREATE OR REPLACE FUNCTION public.calculate_unified_service_fee(
  p_base_amount_cents bigint,
  p_is_card boolean,
  p_merchant_id uuid
)
RETURNS TABLE(
  service_fee_cents bigint,
  total_amount_cents bigint,
  basis_points integer,
  fixed_fee integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_basis_points integer;
  v_fixed_fee integer;
  v_ach_basis_points integer;
  v_ach_fixed_fee integer;
  v_calculated_fee bigint;
BEGIN
  -- Get fee profile
  SELECT 
    gf.basis_points,
    gf.fixed_fee,
    gf.ach_basis_points,
    gf.ach_fixed_fee
  INTO v_basis_points, v_fixed_fee, v_ach_basis_points, v_ach_fixed_fee
  FROM public.get_merchant_fee_profile(p_merchant_id) gf;
  
  -- Calculate fee based on payment type
  IF p_is_card THEN
    v_calculated_fee := ROUND((p_base_amount_cents * v_basis_points::numeric) / 10000) + v_fixed_fee;
    RETURN QUERY SELECT v_calculated_fee, p_base_amount_cents + v_calculated_fee, v_basis_points, v_fixed_fee;
  ELSE
    v_calculated_fee := ROUND((p_base_amount_cents * v_ach_basis_points::numeric) / 10000) + v_ach_fixed_fee;
    RETURN QUERY SELECT v_calculated_fee, p_base_amount_cents + v_calculated_fee, v_ach_basis_points, v_ach_fixed_fee;
  END IF;
END;
$$;

-- Helper function to validate payment entity
CREATE OR REPLACE FUNCTION public.validate_payment_entity(
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE p_entity_type
    WHEN 'permit' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.permit_applications 
        WHERE permit_id = p_entity_id AND user_id = p_user_id
      );
    WHEN 'business_license' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.business_license_applications 
        WHERE id = p_entity_id AND user_id = p_user_id
      );
    WHEN 'tax_submission' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.tax_submissions 
        WHERE id = p_entity_id AND user_id = p_user_id
      );
    WHEN 'service_application' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.municipal_service_applications 
        WHERE id = p_entity_id AND user_id = p_user_id
      );
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Main unified payment transaction function
CREATE OR REPLACE FUNCTION public.create_unified_payment_transaction(
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid,
  p_customer_id uuid,
  p_merchant_id uuid,
  p_base_amount_cents bigint,
  p_payment_instrument_id text,
  p_payment_type text,
  p_is_card boolean,
  p_idempotency_id text,
  p_fraud_session_id text DEFAULT NULL,
  p_card_brand text DEFAULT NULL,
  p_card_last_four text DEFAULT NULL,
  p_bank_last_four text DEFAULT NULL,
  p_merchant_name text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_statement_descriptor text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_user_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_history_id uuid;
  v_service_fee_cents bigint;
  v_total_amount_cents bigint;
  v_basis_points integer;
  v_fixed_fee integer;
  v_finix_merchant_id text;
  result jsonb;
BEGIN
  -- Validate entity exists and belongs to user
  IF NOT public.validate_payment_entity(p_entity_type, p_entity_id, p_user_id) THEN
    RAISE EXCEPTION 'Invalid entity or access denied';
  END IF;

  -- Get merchant info
  SELECT finix_merchant_id INTO v_finix_merchant_id
  FROM public.merchants
  WHERE id = p_merchant_id;

  IF v_finix_merchant_id IS NULL THEN
    RAISE EXCEPTION 'Merchant not found or not configured';
  END IF;

  -- Calculate service fee
  SELECT service_fee_cents, total_amount_cents, basis_points, fixed_fee
  INTO v_service_fee_cents, v_total_amount_cents, v_basis_points, v_fixed_fee
  FROM public.calculate_unified_service_fee(p_base_amount_cents, p_is_card, p_merchant_id);

  -- Create payment history record
  INSERT INTO public.payment_history (
    user_id,
    customer_id,
    entity_type,
    entity_id,
    merchant_id,
    finix_merchant_id,
    amount_cents,
    service_fee_cents,
    total_amount_cents,
    payment_type,
    payment_status,
    payment_method_type,
    payment_instrument_id,
    idempotency_id,
    fraud_session_id,
    card_brand,
    card_last_four,
    bank_last_four,
    merchant_name,
    category,
    subcategory,
    statement_descriptor,
    transfer_state,
    customer_first_name,
    customer_last_name,
    customer_email,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_customer_id,
    p_entity_type,
    p_entity_id,
    p_merchant_id,
    v_finix_merchant_id,
    p_base_amount_cents,
    v_service_fee_cents,
    v_total_amount_cents,
    p_payment_type,
    'pending',
    p_payment_type,
    p_payment_instrument_id,
    p_idempotency_id,
    p_fraud_session_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    p_merchant_name,
    p_category,
    p_subcategory,
    p_statement_descriptor,
    'PENDING',
    p_first_name,
    p_last_name,
    p_user_email,
    now(),
    now()
  ) RETURNING id INTO v_payment_history_id;

  -- Return success with details
  result := jsonb_build_object(
    'success', true,
    'payment_history_id', v_payment_history_id,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents,
    'basis_points', v_basis_points,
    'fixed_fee', v_fixed_fee,
    'finix_merchant_id', v_finix_merchant_id
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Full rollback on any error
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$;

-- Function to update payment status after successful processing
CREATE OR REPLACE FUNCTION public.update_unified_payment_status(
  p_payment_history_id uuid,
  p_finix_transfer_id text,
  p_transfer_state text,
  p_payment_status text DEFAULT 'completed'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entity_type text;
  v_entity_id uuid;
BEGIN
  -- Update payment history
  UPDATE public.payment_history
  SET 
    finix_transfer_id = p_finix_transfer_id,
    transfer_state = p_transfer_state,
    payment_status = p_payment_status,
    processed_at = now(),
    updated_at = now()
  WHERE id = p_payment_history_id
  RETURNING entity_type, entity_id INTO v_entity_type, v_entity_id;

  -- Update entity status if payment successful
  IF p_payment_status = 'completed' AND p_transfer_state = 'SUCCEEDED' THEN
    CASE v_entity_type
      WHEN 'permit' THEN
        UPDATE public.permit_applications
        SET payment_status = 'paid', finix_transfer_id = p_finix_transfer_id, payment_processed_at = now()
        WHERE permit_id = v_entity_id;
      WHEN 'business_license' THEN
        UPDATE public.business_license_applications
        SET payment_status = 'paid', finix_transfer_id = p_finix_transfer_id, payment_processed_at = now()
        WHERE id = v_entity_id;
      WHEN 'tax_submission' THEN
        UPDATE public.tax_submissions
        SET payment_status = 'paid', finix_transfer_id = p_finix_transfer_id, payment_processed_at = now()
        WHERE id = v_entity_id;
      WHEN 'service_application' THEN
        UPDATE public.municipal_service_applications
        SET payment_status = 'paid', finix_transfer_id = p_finix_transfer_id, payment_processed_at = now()
        WHERE id = v_entity_id;
    END CASE;
  END IF;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;