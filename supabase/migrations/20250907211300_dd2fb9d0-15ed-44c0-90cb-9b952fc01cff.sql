-- Fix the create_unified_payment_transaction function to work with actual table structure
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
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_user_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id uuid;
  v_service_fee_cents bigint := 0;
  v_total_amount_cents bigint;
  v_merchant_fee_profile RECORD;
  result jsonb;
BEGIN
  -- Get merchant fee profile for fee calculation
  SELECT basis_points, fixed_fee, ach_basis_points, ach_fixed_fee
  INTO v_merchant_fee_profile
  FROM public.merchant_fee_profiles mfp
  JOIN public.merchants m ON m.id = mfp.merchant_id
  WHERE m.id = p_merchant_id;

  -- Calculate service fee based on payment type
  IF p_is_card THEN
    v_service_fee_cents := COALESCE(v_merchant_fee_profile.fixed_fee, 0) + 
                          (p_base_amount_cents * COALESCE(v_merchant_fee_profile.basis_points, 0) / 10000);
  ELSE
    v_service_fee_cents := COALESCE(v_merchant_fee_profile.ach_fixed_fee, 0) + 
                          (p_base_amount_cents * COALESCE(v_merchant_fee_profile.ach_basis_points, 0) / 10000);
  END IF;

  v_total_amount_cents := p_base_amount_cents + v_service_fee_cents;

  -- Insert payment transaction with entity-specific column mapping
  INSERT INTO public.payment_transactions (
    user_id,
    customer_id,
    merchant_id,
    permit_id,
    business_license_id,
    service_application_id,
    tax_submission_id,
    bill_id,
    base_amount_cents,
    service_fee_cents,
    total_amount_cents,
    payment_type,
    payment_instrument_id,
    card_brand,
    card_last_four,
    bank_last_four,
    payment_status,
    transfer_state,
    idempotency_id,
    fraud_session_id
  ) VALUES (
    p_user_id,
    p_customer_id,
    p_merchant_id,
    CASE WHEN p_entity_type = 'permit' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'business_license' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'service_application' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'tax_submission' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'bill' THEN p_entity_id ELSE NULL END,
    p_base_amount_cents,
    v_service_fee_cents,
    v_total_amount_cents,
    p_payment_type,
    p_payment_instrument_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    'pending',
    'PENDING',
    p_idempotency_id,
    p_fraud_session_id
  ) RETURNING id INTO v_transaction_id;

  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$;