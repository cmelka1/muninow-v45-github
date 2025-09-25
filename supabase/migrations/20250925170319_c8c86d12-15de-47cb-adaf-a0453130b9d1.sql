-- Add missing payment_instrument_id field to tax_submissions table
ALTER TABLE public.tax_submissions 
ADD COLUMN IF NOT EXISTS payment_instrument_id TEXT;

-- Add missing filed_at timestamp field for completion tracking
ALTER TABLE public.tax_submissions 
ADD COLUMN IF NOT EXISTS filed_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on tax_submissions table (idempotent)
ALTER TABLE public.tax_submissions ENABLE ROW LEVEL SECURITY;

-- Create payment_transactions table if it doesn't exist (needed for unified payment system)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  merchant_id UUID,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('permit', 'business_license', 'tax_submission', 'service_application')),
  entity_id UUID NOT NULL,
  base_amount_cents BIGINT NOT NULL,
  service_fee_cents BIGINT NOT NULL DEFAULT 0,
  total_amount_cents BIGINT NOT NULL,
  payment_instrument_id TEXT,
  payment_type TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  transfer_state TEXT,
  finix_transfer_id TEXT,
  idempotency_id TEXT UNIQUE,
  fraud_session_id TEXT,
  card_brand TEXT,
  card_last_four TEXT,
  bank_last_four TEXT,
  first_name TEXT,
  last_name TEXT,
  user_email TEXT,
  raw_finix_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create or replace function to create unified payment transaction with fee calculation
CREATE OR REPLACE FUNCTION public.create_unified_payment_transaction(
  p_user_id UUID,
  p_customer_id UUID,
  p_merchant_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_base_amount_cents BIGINT,
  p_payment_instrument_id TEXT,
  p_payment_type TEXT,
  p_fraud_session_id TEXT DEFAULT NULL,
  p_idempotency_id TEXT DEFAULT NULL,
  p_is_card BOOLEAN DEFAULT true,
  p_card_brand TEXT DEFAULT NULL,
  p_card_last_four TEXT DEFAULT NULL,
  p_bank_last_four TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_service_fee_cents BIGINT;
  v_total_amount_cents BIGINT;
  v_basis_points INTEGER;
  v_fixed_fee_cents INTEGER;
  result JSONB;
BEGIN
  -- Calculate service fee based on payment type
  IF p_is_card THEN
    v_basis_points := 300; -- 3.00%
    v_fixed_fee_cents := 50; -- $0.50
  ELSE
    v_basis_points := 150; -- 1.50%
    v_fixed_fee_cents := 50; -- $0.50
  END IF;
  
  -- Calculate fees
  v_service_fee_cents := ROUND((p_base_amount_cents * v_basis_points) / 10000.0) + v_fixed_fee_cents;
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
    payment_status,
    idempotency_id,
    fraud_session_id,
    card_brand,
    card_last_four,
    bank_last_four,
    first_name,
    last_name,
    user_email
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
    'pending',
    p_idempotency_id,
    p_fraud_session_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    p_first_name,
    p_last_name,
    p_user_email
  ) RETURNING id INTO v_transaction_id;
  
  -- Return success with transaction details
  result := jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'service_fee_cents', v_service_fee_cents,
    'total_amount_cents', v_total_amount_cents,
    'basis_points', v_basis_points
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