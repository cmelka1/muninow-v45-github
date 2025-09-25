-- Drop the problematic function overload with p_staging_id as text
DROP FUNCTION IF EXISTS public.create_tax_submission_before_payment(
  p_user_id uuid, 
  p_customer_id uuid, 
  p_merchant_id uuid, 
  p_tax_type text, 
  p_tax_period_start date, 
  p_tax_period_end date, 
  p_tax_year integer, 
  p_amount_cents bigint, 
  p_calculation_notes text, 
  p_total_amount_due_cents bigint, 
  p_staging_id text, 
  p_first_name text, 
  p_last_name text, 
  p_user_email text, 
  p_payer_ein text, 
  p_payer_phone text, 
  p_payer_street_address text, 
  p_payer_city text, 
  p_payer_state text, 
  p_payer_zip_code text, 
  p_payer_business_name text
);