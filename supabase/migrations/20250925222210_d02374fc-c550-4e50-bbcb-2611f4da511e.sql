-- Drop the simpler function overload with staging_id parameter
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
  p_staging_id uuid
);