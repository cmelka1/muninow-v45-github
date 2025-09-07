-- Update create_unified_payment_transaction function to query merchant fees and fix payment status
CREATE OR REPLACE FUNCTION public.create_unified_payment_transaction(
  p_user_id uuid,
  p_customer_id uuid,
  p_merchant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_base_amount_cents bigint,
  p_payment_instrument_id text,
  p_payment_type text,
  p_fraud_session_id text,
  p_idempotency_id text,
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
  v_merchant_name text;
  v_category text;
  v_subcategory text;
  v_statement_descriptor text;
  v_finix_merchant_id text;
  v_merchant_finix_identity_id text;
  
  -- Fee variables from merchant_fee_profiles
  v_basis_points integer;
  v_fixed_fee integer;
  v_ach_basis_points integer;
  v_ach_fixed_fee integer;
  
  -- Calculated fee variables
  v_service_fee_cents bigint;
  v_total_amount_cents bigint;
  
  v_payment_history_id uuid;
  result jsonb;
BEGIN
  -- Get merchant details and fee structure
  SELECT 
    m.merchant_name,
    m.category,
    m.subcategory,
    m.statement_descriptor,
    m.finix_merchant_id,
    m.finix_identity_id,
    COALESCE(mfp.basis_points, 300) as basis_points, -- Default 3% if no fee profile
    COALESCE(mfp.fixed_fee, 50) as fixed_fee, -- Default $0.50 if no fee profile
    COALESCE(mfp.ach_basis_points, 0) as ach_basis_points, -- Default 0% for ACH
    COALESCE(mfp.ach_fixed_fee, 50) as ach_fixed_fee -- Default $0.50 for ACH
  INTO 
    v_merchant_name,
    v_category,
    v_subcategory,
    v_statement_descriptor,
    v_finix_merchant_id,
    v_merchant_finix_identity_id,
    v_basis_points,
    v_fixed_fee,
    v_ach_basis_points,
    v_ach_fixed_fee
  FROM merchants m
  LEFT JOIN merchant_fee_profiles mfp ON m.id = mfp.merchant_id
  WHERE m.id = p_merchant_id;

  -- Validate merchant exists
  IF v_merchant_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Merchant not found');
  END IF;

  -- Calculate service fee based on payment type
  IF p_payment_type IN ('PAYMENT_CARD', 'google-pay', 'apple-pay') THEN
    -- Card payments: use card fee structure
    v_service_fee_cents := ROUND(p_base_amount_cents * v_basis_points / 10000.0) + v_fixed_fee;
  ELSE
    -- ACH payments: use ACH fee structure
    v_service_fee_cents := ROUND(p_base_amount_cents * v_ach_basis_points / 10000.0) + v_ach_fixed_fee;
  END IF;

  -- Calculate total amount
  v_total_amount_cents := p_base_amount_cents + v_service_fee_cents;

  -- Create payment history record with "unpaid" status (not "pending")
  INSERT INTO public.payment_history (
    user_id,
    customer_id,
    merchant_id,
    entity_type,
    entity_id,
    amount_cents,
    service_fee_cents,
    total_amount_cents,
    payment_instrument_id,
    payment_type,
    payment_method_type,
    payment_status, -- Start with "unpaid", only change to "paid" after Finix success
    transfer_state,
    idempotency_id,
    fraud_session_id,
    card_brand,
    card_last_four,
    bank_last_four,
    finix_merchant_id,
    merchant_finix_identity_id,
    merchant_name,
    category,
    subcategory,
    statement_descriptor,
    customer_first_name,
    customer_last_name,
    customer_email,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_customer_id,
    p_merchant_id,
    p_entity_type,
    p_entity_id,
    p_base_amount_cents,
    v_service_fee_cents,
    v_total_amount_cents,
    p_payment_instrument_id,
    p_payment_type,
    p_payment_type,
    'unpaid', -- Start as unpaid, not pending
    'PENDING',
    p_idempotency_id,
    p_fraud_session_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    v_finix_merchant_id,
    v_merchant_finix_identity_id,
    v_merchant_name,
    v_category,
    v_subcategory,
    v_statement_descriptor,
    p_first_name,
    p_last_name,
    p_user_email,
    now(),
    now()
  ) RETURNING id INTO v_payment_history_id;

  -- Return success with calculated amounts
  result := jsonb_build_object(
    'success', true,
    'payment_history_id', v_payment_history_id,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents,
    'merchant_name', v_merchant_name,
    'finix_merchant_id', v_finix_merchant_id
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$;