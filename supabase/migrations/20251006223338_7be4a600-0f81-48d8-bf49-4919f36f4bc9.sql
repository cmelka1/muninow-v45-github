-- Update create_unified_payment_transaction to accept and store UUID and metadata

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.create_unified_payment_transaction(
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
  p_is_card boolean,
  p_card_brand text,
  p_card_last_four text,
  p_bank_last_four text,
  p_first_name text,
  p_last_name text,
  p_user_email text
);

-- Recreate with new UUID and metadata parameters
CREATE OR REPLACE FUNCTION public.create_unified_payment_transaction(
  p_user_id uuid,
  p_customer_id uuid,
  p_merchant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_base_amount_cents bigint,
  p_payment_instrument_id text,
  p_payment_type text,
  p_fraud_session_id text DEFAULT NULL,
  p_idempotency_id text DEFAULT NULL,
  p_idempotency_uuid uuid DEFAULT NULL,
  p_idempotency_metadata jsonb DEFAULT '{}'::jsonb,
  p_is_card boolean DEFAULT true,
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
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_service_fee_cents bigint;
  v_total_amount_cents bigint;
  v_merchant record;
  v_fee_profile record;
  v_basis_points integer;
  v_fixed_fee integer;
  v_ach_basis_points integer;
  v_ach_fixed_fee integer;
  v_ach_basis_points_fee_limit integer;
BEGIN
  -- Get merchant information
  SELECT 
    finix_merchant_id,
    finix_identity_id,
    merchant_name,
    category,
    subcategory,
    statement_descriptor
  INTO v_merchant
  FROM public.merchants
  WHERE id = p_merchant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Merchant not found'
    );
  END IF;

  -- Get fee profile for merchant
  SELECT 
    basis_points,
    fixed_fee,
    ach_basis_points,
    ach_fixed_fee,
    ach_basis_points_fee_limit
  INTO v_fee_profile
  FROM public.merchant_fee_profiles
  WHERE merchant_id = p_merchant_id;

  -- Use fee profile or fallback to defaults
  v_basis_points := COALESCE(v_fee_profile.basis_points, 300);
  v_fixed_fee := COALESCE(v_fee_profile.fixed_fee, 50);
  v_ach_basis_points := COALESCE(v_fee_profile.ach_basis_points, 150);
  v_ach_fixed_fee := COALESCE(v_fee_profile.ach_fixed_fee, 50);
  v_ach_basis_points_fee_limit := v_fee_profile.ach_basis_points_fee_limit;

  -- Calculate service fee based on payment type
  IF p_is_card THEN
    v_service_fee_cents := (p_base_amount_cents * v_basis_points / 10000) + v_fixed_fee;
  ELSE
    -- ACH payment
    v_service_fee_cents := (p_base_amount_cents * v_ach_basis_points / 10000) + v_ach_fixed_fee;
    
    -- Apply ACH fee limit if configured
    IF v_ach_basis_points_fee_limit IS NOT NULL AND v_service_fee_cents > v_ach_basis_points_fee_limit THEN
      v_service_fee_cents := v_ach_basis_points_fee_limit;
    END IF;
  END IF;

  v_total_amount_cents := p_base_amount_cents + v_service_fee_cents;

  -- Insert payment transaction with UUID and metadata
  INSERT INTO public.payment_transactions (
    user_id,
    customer_id,
    merchant_id,
    base_amount_cents,
    service_fee_cents,
    total_amount_cents,
    payment_type,
    payment_instrument_id,
    card_brand,
    card_last_four,
    bank_last_four,
    finix_merchant_id,
    merchant_name,
    category,
    subcategory,
    statement_descriptor,
    payment_status,
    transfer_state,
    idempotency_id,
    idempotency_uuid,
    idempotency_metadata,
    fraud_session_id
  )
  VALUES (
    p_user_id,
    p_customer_id,
    p_merchant_id,
    p_base_amount_cents,
    v_service_fee_cents,
    v_total_amount_cents,
    p_payment_type,
    p_payment_instrument_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    v_merchant.finix_merchant_id,
    v_merchant.merchant_name,
    v_merchant.category,
    v_merchant.subcategory,
    v_merchant.statement_descriptor,
    'pending',
    'PENDING',
    p_idempotency_id,
    p_idempotency_uuid,
    p_idempotency_metadata,
    p_fraud_session_id
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;