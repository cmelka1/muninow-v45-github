-- Fix the create_tax_submission_with_unified_payment function to handle null values properly
CREATE OR REPLACE FUNCTION public.create_tax_submission_with_unified_payment(
  p_transaction_id UUID,
  p_finix_transfer_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_tax_submission_id UUID;
  result JSONB;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM public.payment_transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Validate required fields from transaction
  IF v_transaction.total_amount_cents IS NULL OR v_transaction.total_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid total amount in transaction');
  END IF;
  
  IF v_transaction.base_amount_cents IS NULL OR v_transaction.base_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid base amount in transaction');
  END IF;
  
  -- Create tax submission record
  INSERT INTO public.tax_submissions (
    user_id,
    customer_id,
    merchant_id,
    tax_type,
    tax_period_start,
    tax_period_end,
    tax_year,
    amount_cents,
    service_fee_cents,
    total_amount_cents,
    total_amount_due_cents,
    payment_instrument_id,
    payment_type,
    submission_status,
    payment_status,
    transfer_state,
    finix_transfer_id,
    idempotency_id,
    fraud_session_id,
    category,
    subcategory,
    statement_descriptor,
    first_name,
    last_name,
    email,
    calculation_notes,
    filed_at,
    submitted_at,
    paid_at
  ) VALUES (
    v_transaction.user_id,
    v_transaction.customer_id,
    v_transaction.merchant_id,
    'Municipal Tax',
    CURRENT_DATE,
    CURRENT_DATE,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    v_transaction.base_amount_cents,
    COALESCE(v_transaction.service_fee_cents, 0),
    v_transaction.total_amount_cents,
    v_transaction.base_amount_cents,
    v_transaction.payment_instrument_id,
    v_transaction.payment_type,
    'filed',
    'paid',
    'SUCCEEDED',
    p_finix_transfer_id,
    v_transaction.idempotency_id,
    v_transaction.fraud_session_id,
    'Administrative & Civic Fees',
    'Municipal Tax',
    'Municipal Tax Payment',
    v_transaction.first_name,
    v_transaction.last_name,
    v_transaction.user_email,
    'Tax payment processed via unified payment system',
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_tax_submission_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tax_submission_id', v_tax_submission_id
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