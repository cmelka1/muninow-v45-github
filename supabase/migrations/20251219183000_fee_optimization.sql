-- Fee Optimization Migration
-- 1. Centralized Fee Calculation Function
-- 2. Updated Payment Transaction RPC
-- 3. New Preview Service Fee RPC

-- 1. Centralized Fee Calculation Function
CREATE OR REPLACE FUNCTION calculate_merchant_fee(
  p_base_amount_cents bigint,
  p_merchant_id uuid,
  p_is_card boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fee_profile record;
  v_basis_points integer;
  v_fixed_fee integer;
  v_service_fee_cents bigint;
BEGIN
  -- Get fee profile
  SELECT 
    basis_points,
    fixed_fee,
    ach_basis_points,
    ach_fixed_fee,
    ach_basis_points_fee_limit
  INTO v_fee_profile
  FROM merchant_fee_profiles
  WHERE merchant_id = p_merchant_id;

  -- Default values if profile missing
  IF NOT FOUND THEN
    v_basis_points := 300;
    v_fixed_fee := 50;
  ELSE
    IF p_is_card THEN
      v_basis_points := COALESCE(v_fee_profile.basis_points, 300);
      v_fixed_fee := COALESCE(v_fee_profile.fixed_fee, 50);
    ELSE
      v_basis_points := COALESCE(v_fee_profile.ach_basis_points, 150);
      v_fixed_fee := COALESCE(v_fee_profile.ach_fixed_fee, 50);
    END IF;
  END IF;

  -- Calculate Fee
  v_service_fee_cents := (p_base_amount_cents * v_basis_points / 10000) + v_fixed_fee;

  -- Apply ACH Limit if applicable
  IF NOT p_is_card AND v_fee_profile.ach_basis_points_fee_limit IS NOT NULL THEN
    IF v_service_fee_cents > v_fee_profile.ach_basis_points_fee_limit THEN
      v_service_fee_cents := v_fee_profile.ach_basis_points_fee_limit;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'service_fee_cents', v_service_fee_cents,
    'basis_points', v_basis_points,
    'fixed_fee', v_fixed_fee,
    'total_amount_cents', p_base_amount_cents + v_service_fee_cents
  );
END;
$$;

-- 2. Update create_unified_payment_transaction to use centralized logic
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction_id uuid;
  v_fee_result jsonb;
  v_service_fee_cents bigint;
  v_total_amount_cents bigint;
  v_merchant record;
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
    RETURN jsonb_build_object('success', false, 'error', 'Merchant not found');
  END IF;

  -- Calculate Fees using Centralized Function
  v_fee_result := calculate_merchant_fee(p_base_amount_cents, p_merchant_id, p_is_card);
  v_service_fee_cents := (v_fee_result->>'service_fee_cents')::bigint;
  v_total_amount_cents := (v_fee_result->>'total_amount_cents')::bigint;

  -- Insert payment transaction
  INSERT INTO public.payment_transactions (
    user_id, customer_id, merchant_id, base_amount_cents, service_fee_cents, total_amount_cents,
    payment_type, payment_instrument_id, card_brand, card_last_four, bank_last_four,
    finix_merchant_id, merchant_name, category, subcategory, statement_descriptor,
    payment_status, transfer_state, idempotency_uuid, idempotency_metadata, fraud_session_id
  )
  VALUES (
    p_user_id, p_customer_id, p_merchant_id, p_base_amount_cents, v_service_fee_cents, v_total_amount_cents,
    p_payment_type, p_payment_instrument_id, p_card_brand, p_card_last_four, p_bank_last_four,
    v_merchant.finix_merchant_id, v_merchant.merchant_name, v_merchant.category, v_merchant.subcategory, v_merchant.statement_descriptor,
    'pending', 'PENDING', p_idempotency_uuid, p_idempotency_metadata, p_fraud_session_id
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 3. New Preview Service Fee RPC (for Frontend)
CREATE OR REPLACE FUNCTION preview_service_fee(
  p_base_amount_cents bigint,
  p_merchant_id uuid,
  p_is_card boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fee_result jsonb;
BEGIN
  v_fee_result := calculate_merchant_fee(p_base_amount_cents, p_merchant_id, p_is_card);
  
  RETURN jsonb_build_object(
    'success', true,
    'serviceFee', (v_fee_result->>'service_fee_cents')::bigint,
    'totalAmount', (v_fee_result->>'total_amount_cents')::bigint,
    'basisPoints', (v_fee_result->>'basis_points')::integer,
    'fixedFee', (v_fee_result->>'fixed_fee')::integer,
    'isCard', p_is_card
  );
END;
$$;
