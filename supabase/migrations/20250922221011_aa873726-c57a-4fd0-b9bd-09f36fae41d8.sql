-- Drop the old version of create_tax_submission_with_payment function that uses p_calculation_data
-- This function has 33 parameters and conflicts with the newer 34-parameter version
DROP FUNCTION IF EXISTS public.create_tax_submission_with_payment(
  uuid, uuid, uuid, text, date, date, integer, bigint, jsonb, text, text, bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
);