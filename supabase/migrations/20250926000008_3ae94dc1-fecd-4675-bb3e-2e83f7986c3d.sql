-- Fix create_unified_payment_transaction to properly handle table-returning calculate_unified_service_fee
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
  p_is_card boolean,
  p_card_brand text,
  p_card_last_four text,
  p_bank_last_four text,
  p_first_name text,
  p_last_name text,
  p_user_email text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_fee_cents bigint := 0;
  v_total_amount_cents bigint := 0;
  v_transaction_id uuid;
BEGIN
  -- Idempotency: if a transaction already exists for this idempotency key, return it
  IF EXISTS (
    SELECT 1
    FROM public.payment_transactions
    WHERE idempotency_id = p_idempotency_id
  ) THEN
    SELECT id, service_fee_cents, total_amount_cents
      INTO v_transaction_id, v_service_fee_cents, v_total_amount_cents
    FROM public.payment_transactions
    WHERE idempotency_id = p_idempotency_id
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'transaction_id', v_transaction_id,
      'service_fee_cents', v_service_fee_cents,
      'total_amount_cents', v_total_amount_cents,
      'duplicate_prevented', true
    );
  END IF;

  -- Calculate service fee using existing function - properly handle table result
  SELECT service_fee_cents, total_amount_cents
  INTO v_service_fee_cents, v_total_amount_cents
  FROM public.calculate_unified_service_fee(
    p_base_amount_cents,
    COALESCE(p_is_card, false),
    p_merchant_id
  );

  -- Insert initial pending transaction mapped to entity-specific column
  INSERT INTO public.payment_transactions (
    user_id, customer_id, merchant_id,
    permit_id, business_license_id, service_application_id, tax_submission_id, bill_id,
    base_amount_cents, service_fee_cents, total_amount_cents,
    payment_type, payment_instrument_id,
    card_brand, card_last_four, bank_last_four,
    idempotency_id, fraud_session_id,
    payment_status, transfer_state,
    created_at, updated_at
  )
  VALUES (
    p_user_id, p_customer_id, p_merchant_id,
    CASE WHEN p_entity_type = 'permit' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'business_license' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'service_application' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'tax_submission' THEN p_entity_id ELSE NULL END,
    CASE WHEN p_entity_type = 'bill' THEN p_entity_id ELSE NULL END,
    p_base_amount_cents, v_service_fee_cents, v_total_amount_cents,
    p_payment_type, p_payment_instrument_id,
    p_card_brand, p_card_last_four, p_bank_last_four,
    p_idempotency_id, p_fraud_session_id,
    'pending', 'PENDING',
    now(), now()
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
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;