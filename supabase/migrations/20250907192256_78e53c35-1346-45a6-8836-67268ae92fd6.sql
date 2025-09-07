-- Fix create_unified_payment_transaction function to remove non-existent column references
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
  v_service_fee_cents bigint;
  v_total_amount_cents bigint;
  v_payment_history_id uuid;
  v_finix_merchant_id text;
  result jsonb;
BEGIN
  -- Calculate service fee (simplified - 3% + $0.30 for cards, $0.50 for ACH)
  IF p_is_card THEN
    v_service_fee_cents := ROUND(p_base_amount_cents * 0.03) + 30;
  ELSE
    v_service_fee_cents := 50;
  END IF;
  
  v_total_amount_cents := p_base_amount_cents + v_service_fee_cents;
  
  -- Get finix_merchant_id from merchants table
  SELECT finix_merchant_id INTO v_finix_merchant_id
  FROM merchants
  WHERE id = p_merchant_id;
  
  -- Insert payment history based on entity type
  CASE p_entity_type
    WHEN 'permit' THEN
      INSERT INTO payment_history (
        user_id,
        customer_id,
        permit_id,
        amount_cents,
        service_fee_cents,
        total_amount_cents,
        payment_type,
        payment_status,
        payment_instrument_id,
        idempotency_id,
        fraud_session_id,
        card_brand,
        card_last_four,
        bank_last_four,
        merchant_id,
        finix_merchant_id,
        merchant_name,
        category,
        subcategory,
        statement_descriptor,
        transfer_state,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        p_customer_id,
        p_entity_id,
        p_base_amount_cents,
        v_service_fee_cents,
        v_total_amount_cents,
        p_payment_type,
        'pending',
        p_payment_instrument_id,
        p_idempotency_id,
        p_fraud_session_id,
        p_card_brand,
        p_card_last_four,
        p_bank_last_four,
        p_merchant_id,
        v_finix_merchant_id,
        p_merchant_name,
        p_category,
        p_subcategory,
        p_statement_descriptor,
        'PENDING',
        now(),
        now()
      ) RETURNING id INTO v_payment_history_id;
      
    WHEN 'business_license' THEN
      INSERT INTO payment_history (
        user_id,
        customer_id,
        business_license_id,
        amount_cents,
        service_fee_cents,
        total_amount_cents,
        payment_type,
        payment_status,
        payment_instrument_id,
        idempotency_id,
        fraud_session_id,
        card_brand,
        card_last_four,
        bank_last_four,
        merchant_id,
        finix_merchant_id,
        merchant_name,
        category,
        subcategory,
        statement_descriptor,
        transfer_state,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        p_customer_id,
        p_entity_id,
        p_base_amount_cents,
        v_service_fee_cents,
        v_total_amount_cents,
        p_payment_type,
        'pending',
        p_payment_instrument_id,
        p_idempotency_id,
        p_fraud_session_id,
        p_card_brand,
        p_card_last_four,
        p_bank_last_four,
        p_merchant_id,
        v_finix_merchant_id,
        p_merchant_name,
        p_category,
        p_subcategory,
        p_statement_descriptor,
        'PENDING',
        now(),
        now()
      ) RETURNING id INTO v_payment_history_id;
      
    WHEN 'tax_submission' THEN
      INSERT INTO payment_history (
        user_id,
        customer_id,
        tax_submission_id,
        amount_cents,
        service_fee_cents,
        total_amount_cents,
        payment_type,
        payment_status,
        payment_instrument_id,
        idempotency_id,
        fraud_session_id,
        card_brand,
        card_last_four,
        bank_last_four,
        merchant_id,
        finix_merchant_id,
        merchant_name,
        category,
        subcategory,
        statement_descriptor,
        transfer_state,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        p_customer_id,
        p_entity_id,
        p_base_amount_cents,
        v_service_fee_cents,
        v_total_amount_cents,
        p_payment_type,
        'pending',
        p_payment_instrument_id,
        p_idempotency_id,
        p_fraud_session_id,
        p_card_brand,
        p_card_last_four,
        p_bank_last_four,
        p_merchant_id,
        v_finix_merchant_id,
        p_merchant_name,
        p_category,
        p_subcategory,
        p_statement_descriptor,
        'PENDING',
        now(),
        now()
      ) RETURNING id INTO v_payment_history_id;
      
    WHEN 'service_application' THEN
      INSERT INTO payment_history (
        user_id,
        customer_id,
        service_application_id,
        amount_cents,
        service_fee_cents,
        total_amount_cents,
        payment_type,
        payment_status,
        payment_instrument_id,
        idempotency_id,
        fraud_session_id,
        card_brand,
        card_last_four,
        bank_last_four,
        merchant_id,
        finix_merchant_id,
        merchant_name,
        category,
        subcategory,
        statement_descriptor,
        transfer_state,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        p_customer_id,
        p_entity_id,
        p_base_amount_cents,
        v_service_fee_cents,
        v_total_amount_cents,
        p_payment_type,
        'pending',
        p_payment_instrument_id,
        p_idempotency_id,
        p_fraud_session_id,
        p_card_brand,
        p_card_last_four,
        p_bank_last_four,
        p_merchant_id,
        v_finix_merchant_id,
        p_merchant_name,
        p_category,
        p_subcategory,
        p_statement_descriptor,
        'PENDING',
        now(),
        now()
      ) RETURNING id INTO v_payment_history_id;
      
    ELSE
      RAISE EXCEPTION 'Unsupported entity type: %', p_entity_type;
  END CASE;

  -- Return success with relevant data
  result := jsonb_build_object(
    'success', true,
    'payment_history_id', v_payment_history_id,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents,
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