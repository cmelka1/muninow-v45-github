-- Drop ALL existing versions of create_unified_payment_transaction function
DROP FUNCTION IF EXISTS public.create_unified_payment_transaction CASCADE;

-- Create the single definitive version that matches the edge function call
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
  v_service_fee_cents bigint;
  v_total_amount_cents bigint;
  v_payment_transaction_id uuid;
  v_merchant_record record;
  result jsonb;
BEGIN
  -- Get merchant details
  SELECT * INTO v_merchant_record
  FROM merchants 
  WHERE id = p_merchant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found: %', p_merchant_id;
  END IF;

  -- Calculate service fee (3% for cards, 1% for ACH)
  IF p_payment_type = 'card' THEN
    v_service_fee_cents := (p_base_amount_cents * 3) / 100;
  ELSE
    v_service_fee_cents := (p_base_amount_cents * 1) / 100;
  END IF;
  
  -- Calculate total amount
  v_total_amount_cents := p_base_amount_cents + v_service_fee_cents;

  -- Create payment transaction record
  INSERT INTO public.payment_transactions (
    user_id,
    customer_id,
    merchant_id,
    entity_type,
    entity_id,
    base_amount_cents,
    service_fee_cents,
    total_amount_cents,
    payment_instrument_id,
    payment_type,
    fraud_session_id,
    idempotency_id,
    card_brand,
    card_last_four,
    bank_last_four,
    first_name,
    last_name,
    user_email,
    merchant_name,
    finix_merchant_id,
    status
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
    p_fraud_session_id,
    p_idempotency_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    p_first_name,
    p_last_name,
    p_user_email,
    v_merchant_record.merchant_name,
    v_merchant_record.finix_merchant_id,
    'pending'
  ) RETURNING id INTO v_payment_transaction_id;

  -- Return success with calculated amounts and transaction ID
  result := jsonb_build_object(
    'success', true,
    'payment_transaction_id', v_payment_transaction_id,
    'base_amount_cents', p_base_amount_cents,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents,
    'finix_merchant_id', v_merchant_record.finix_merchant_id
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