-- Drop existing functions first
DROP FUNCTION IF EXISTS public.update_unified_payment_status(uuid,text,text,text);
DROP FUNCTION IF EXISTS public.create_unified_payment_transaction(text,uuid,uuid,uuid,uuid,bigint,text,text,boolean,text,text,text,text,text,text,text,text,text,text,text,text);

-- Create unified payment transaction function
CREATE OR REPLACE FUNCTION public.create_unified_payment_transaction(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID,
  p_customer_id UUID,
  p_merchant_id UUID,
  p_base_amount_cents BIGINT,
  p_payment_instrument_id TEXT,
  p_payment_type TEXT,
  p_is_card BOOLEAN,
  p_idempotency_id TEXT,
  p_fraud_session_id TEXT DEFAULT NULL,
  p_card_brand TEXT DEFAULT NULL,
  p_card_last_four TEXT DEFAULT NULL,
  p_bank_last_four TEXT DEFAULT NULL,
  p_merchant_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_subcategory TEXT DEFAULT NULL,
  p_statement_descriptor TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_history_id UUID;
  v_service_fee_cents BIGINT := 0;
  v_total_amount_cents BIGINT;
  v_finix_merchant_id TEXT;
  result JSONB;
BEGIN
  -- Get merchant's Finix ID
  SELECT finix_merchant_id INTO v_finix_merchant_id
  FROM public.merchants
  WHERE id = p_merchant_id;
  
  IF v_finix_merchant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Merchant not found or missing Finix ID'
    );
  END IF;
  
  -- Calculate service fee (simplified - you may want to use the actual fee calculation)
  IF p_is_card THEN
    v_service_fee_cents := GREATEST(30, ROUND(p_base_amount_cents * 0.029)); -- 2.9% + $0.30
  ELSE
    v_service_fee_cents := GREATEST(100, ROUND(p_base_amount_cents * 0.008)); -- 0.8% + $1.00
  END IF;
  
  v_total_amount_cents := p_base_amount_cents + v_service_fee_cents;
  
  -- Create payment history record with entity-specific column
  IF p_entity_type = 'permit' THEN
    INSERT INTO public.payment_history (
      user_id, customer_id, permit_id, amount_cents, service_fee_cents, total_amount_cents,
      payment_type, payment_status, payment_method_type, payment_instrument_id,
      idempotency_id, fraud_session_id, card_brand, card_last_four, bank_last_four,
      merchant_id, finix_merchant_id, merchant_name, category, subcategory,
      statement_descriptor, transfer_state, created_at, updated_at
    ) VALUES (
      p_user_id, p_customer_id, p_entity_id, p_base_amount_cents, v_service_fee_cents, v_total_amount_cents,
      p_payment_type, 'pending', p_payment_type, p_payment_instrument_id,
      p_idempotency_id, p_fraud_session_id, p_card_brand, p_card_last_four, p_bank_last_four,
      p_merchant_id, v_finix_merchant_id, p_merchant_name, p_category, p_subcategory,
      p_statement_descriptor, 'PENDING', now(), now()
    ) RETURNING id INTO v_payment_history_id;
    
  ELSIF p_entity_type = 'business_license' THEN
    INSERT INTO public.payment_history (
      user_id, customer_id, business_license_id, amount_cents, service_fee_cents, total_amount_cents,
      payment_type, payment_status, payment_method_type, payment_instrument_id,
      idempotency_id, fraud_session_id, card_brand, card_last_four, bank_last_four,
      merchant_id, finix_merchant_id, merchant_name, category, subcategory,
      statement_descriptor, transfer_state, created_at, updated_at
    ) VALUES (
      p_user_id, p_customer_id, p_entity_id, p_base_amount_cents, v_service_fee_cents, v_total_amount_cents,
      p_payment_type, 'pending', p_payment_type, p_payment_instrument_id,
      p_idempotency_id, p_fraud_session_id, p_card_brand, p_card_last_four, p_bank_last_four,
      p_merchant_id, v_finix_merchant_id, p_merchant_name, p_category, p_subcategory,
      p_statement_descriptor, 'PENDING', now(), now()
    ) RETURNING id INTO v_payment_history_id;
    
  ELSIF p_entity_type = 'tax_submission' THEN
    INSERT INTO public.payment_history (
      user_id, customer_id, tax_submission_id, amount_cents, service_fee_cents, total_amount_cents,
      payment_type, payment_status, payment_method_type, payment_instrument_id,
      idempotency_id, fraud_session_id, card_brand, card_last_four, bank_last_four,
      merchant_id, finix_merchant_id, merchant_name, category, subcategory,
      statement_descriptor, transfer_state, created_at, updated_at
    ) VALUES (
      p_user_id, p_customer_id, p_entity_id, p_base_amount_cents, v_service_fee_cents, v_total_amount_cents,
      p_payment_type, 'pending', p_payment_type, p_payment_instrument_id,
      p_idempotency_id, p_fraud_session_id, p_card_brand, p_card_last_four, p_bank_last_four,
      p_merchant_id, v_finix_merchant_id, p_merchant_name, p_category, p_subcategory,
      p_statement_descriptor, 'PENDING', now(), now()
    ) RETURNING id INTO v_payment_history_id;
    
  ELSIF p_entity_type = 'service_application' THEN
    INSERT INTO public.payment_history (
      user_id, customer_id, amount_cents, service_fee_cents, total_amount_cents,
      payment_type, payment_status, payment_method_type, payment_instrument_id,
      idempotency_id, fraud_session_id, card_brand, card_last_four, bank_last_four,
      merchant_id, finix_merchant_id, merchant_name, category, subcategory,
      statement_descriptor, transfer_state, created_at, updated_at
    ) VALUES (
      p_user_id, p_customer_id, p_base_amount_cents, v_service_fee_cents, v_total_amount_cents,
      p_payment_type, 'pending', p_payment_type, p_payment_instrument_id,
      p_idempotency_id, p_fraud_session_id, p_card_brand, p_card_last_four, p_bank_last_four,
      p_merchant_id, v_finix_merchant_id, p_merchant_name, p_category, p_subcategory,
      p_statement_descriptor, 'PENDING', now(), now()
    ) RETURNING id INTO v_payment_history_id;
    
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid entity type: ' || p_entity_type
    );
  END IF;
  
  -- Return success with calculated values
  result := jsonb_build_object(
    'success', true,
    'payment_history_id', v_payment_history_id,
    'finix_merchant_id', v_finix_merchant_id,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents
  );
  
  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Create unified payment status update function
CREATE OR REPLACE FUNCTION public.update_unified_payment_status(
  p_payment_history_id UUID,
  p_finix_transfer_id TEXT,
  p_transfer_state TEXT,
  p_payment_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Update payment history
  UPDATE public.payment_history
  SET 
    finix_transfer_id = p_finix_transfer_id,
    transfer_state = p_transfer_state,
    payment_status = p_payment_status,
    updated_at = now()
  WHERE id = p_payment_history_id;
  
  IF FOUND THEN
    result := jsonb_build_object('success', true);
  ELSE
    result := jsonb_build_object(
      'success', false,
      'error', 'Payment history record not found'
    );
  END IF;
  
  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;