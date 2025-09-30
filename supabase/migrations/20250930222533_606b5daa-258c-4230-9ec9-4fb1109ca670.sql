-- Update create_unified_payment_transaction function to remove bill_id references
CREATE OR REPLACE FUNCTION public.create_unified_payment_transaction(
  p_user_id uuid,
  p_customer_id uuid,
  p_merchant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_base_amount_cents bigint,
  p_service_fee_cents bigint,
  p_total_amount_cents bigint,
  p_payment_type text,
  p_payment_instrument_id text,
  p_card_brand text DEFAULT NULL,
  p_card_last_four text DEFAULT NULL,
  p_bank_last_four text DEFAULT NULL,
  p_finix_merchant_id text DEFAULT NULL,
  p_idempotency_id text DEFAULT NULL,
  p_fraud_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_transaction_id uuid;
  v_result jsonb;
BEGIN
  -- Insert payment transaction record with entity-specific ID
  INSERT INTO public.payment_transactions (
    user_id,
    customer_id,
    merchant_id,
    permit_id,
    business_license_id,
    service_application_id,
    tax_submission_id,
    base_amount_cents,
    service_fee_cents,
    total_amount_cents,
    payment_type,
    payment_instrument_id,
    card_brand,
    card_last_four,
    bank_last_four,
    finix_merchant_id,
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
    p_base_amount_cents,
    p_service_fee_cents,
    p_total_amount_cents,
    p_payment_type,
    p_payment_instrument_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    p_finix_merchant_id,
    'pending',
    'PENDING',
    p_idempotency_id,
    p_fraud_session_id
  ) RETURNING id INTO v_payment_transaction_id;

  -- Return success with transaction ID
  v_result := jsonb_build_object(
    'success', true,
    'payment_transaction_id', v_payment_transaction_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN v_result;
END;
$$;