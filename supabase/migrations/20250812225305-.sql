-- Add tax_submission_id column to payment_history table
ALTER TABLE public.payment_history 
ADD COLUMN tax_submission_id UUID REFERENCES public.tax_submissions(id);

-- Drop the existing check constraint
ALTER TABLE public.payment_history 
DROP CONSTRAINT IF EXISTS payment_history_bill_or_permit_check;

-- Create new check constraint that allows tax payments
ALTER TABLE public.payment_history 
ADD CONSTRAINT payment_history_bill_or_permit_or_tax_check 
CHECK (
  -- Exactly one of these three scenarios must be true:
  (bill_id IS NOT NULL AND permit_id IS NULL AND tax_submission_id IS NULL) OR  -- Bill payment
  (bill_id IS NULL AND permit_id IS NOT NULL AND tax_submission_id IS NULL) OR  -- Permit payment  
  (bill_id IS NULL AND permit_id IS NULL AND tax_submission_id IS NOT NULL)     -- Tax payment
);

-- Update the create_tax_submission_with_payment function to include tax_submission_id
CREATE OR REPLACE FUNCTION public.create_tax_submission_with_payment(
  p_user_id uuid,
  p_customer_id uuid,
  p_merchant_id uuid,
  p_tax_type text,
  p_tax_period_start date,
  p_tax_period_end date,
  p_tax_year integer,
  p_amount_cents bigint,
  p_calculation_data jsonb,
  p_payment_instrument_id text,
  p_finix_merchant_id text,
  p_service_fee_cents bigint,
  p_total_amount_cents bigint,
  p_payment_type text,
  p_idempotency_id text,
  p_fraud_session_id text DEFAULT NULL::text,
  p_card_brand text DEFAULT NULL::text,
  p_card_last_four text DEFAULT NULL::text,
  p_bank_last_four text DEFAULT NULL::text,
  p_merchant_name text DEFAULT NULL::text,
  p_category text DEFAULT NULL::text,
  p_subcategory text DEFAULT NULL::text,
  p_statement_descriptor text DEFAULT NULL::text,
  p_first_name text DEFAULT NULL::text,
  p_last_name text DEFAULT NULL::text,
  p_user_email text DEFAULT NULL::text,
  p_payer_ein text DEFAULT NULL::text,
  p_payer_phone text DEFAULT NULL::text,
  p_payer_street_address text DEFAULT NULL::text,
  p_payer_city text DEFAULT NULL::text,
  p_payer_state text DEFAULT NULL::text,
  p_payer_zip_code text DEFAULT NULL::text,
  p_payer_business_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tax_submission_id uuid;
  v_payment_history_id uuid;
  v_calculation_id uuid;
  result jsonb;
BEGIN
  -- Create tax submission with complete payer information
  INSERT INTO public.tax_submissions (
    user_id,
    customer_id,
    merchant_id,
    tax_type,
    tax_period_start,
    tax_period_end,
    tax_year,
    amount_cents,
    total_amount_cents,
    service_fee_cents,
    finix_merchant_id,
    merchant_name,
    category,
    subcategory,
    statement_descriptor,
    submission_status,
    payment_status,
    transfer_state,
    submission_date,
    idempotency_id,
    fraud_session_id,
    payment_type,
    first_name,
    last_name,
    email,
    payer_ein,
    payer_phone,
    payer_street_address,
    payer_city,
    payer_state,
    payer_zip_code,
    payer_business_name
  ) VALUES (
    p_user_id,
    p_customer_id,
    p_merchant_id,
    p_tax_type,
    p_tax_period_start,
    p_tax_period_end,
    p_tax_year,
    p_amount_cents,
    p_total_amount_cents,
    p_service_fee_cents,
    p_finix_merchant_id,
    p_merchant_name,
    p_category,
    p_subcategory,
    p_statement_descriptor,
    'draft',
    'pending',
    'PENDING',
    now(),
    p_idempotency_id,
    p_fraud_session_id,
    p_payment_type,
    p_first_name,
    p_last_name,
    p_user_email,
    p_payer_ein,
    p_payer_phone,
    p_payer_street_address,
    p_payer_city,
    p_payer_state,
    p_payer_zip_code,
    p_payer_business_name
  ) RETURNING id INTO v_tax_submission_id;

  -- Create tax calculation record
  INSERT INTO public.tax_calculations (
    tax_submission_id,
    calculation_data
  ) VALUES (
    v_tax_submission_id,
    p_calculation_data
  ) RETURNING id INTO v_calculation_id;

  -- Create payment history record with tax_submission_id
  INSERT INTO public.payment_history (
    user_id,
    customer_id,
    tax_submission_id,
    amount_cents,
    service_fee_cents,
    total_amount_cents,
    finix_payment_instrument_id,
    finix_merchant_id,
    currency,
    payment_type,
    transfer_state,
    idempotency_id,
    fraud_session_id,
    card_brand,
    card_last_four,
    bank_last_four,
    merchant_name,
    category,
    subcategory,
    statement_descriptor,
    customer_first_name,
    customer_last_name,
    customer_email,
    payment_status
  ) VALUES (
    p_user_id,
    p_customer_id,
    v_tax_submission_id,
    p_amount_cents,
    p_service_fee_cents,
    p_total_amount_cents,
    p_payment_instrument_id,
    p_finix_merchant_id,
    'USD',
    p_payment_type,
    'PENDING',
    p_idempotency_id,
    p_fraud_session_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    p_merchant_name,
    p_category,
    p_subcategory,
    p_statement_descriptor,
    p_first_name,
    p_last_name,
    p_user_email,
    'pending'
  ) RETURNING id INTO v_payment_history_id;

  -- Return success with IDs
  result := jsonb_build_object(
    'success', true,
    'tax_submission_id', v_tax_submission_id,
    'payment_history_id', v_payment_history_id,
    'calculation_id', v_calculation_id
  );

  RETURN result;
END;
$function$;