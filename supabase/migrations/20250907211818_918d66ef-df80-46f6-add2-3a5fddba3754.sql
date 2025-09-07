
-- Drop the old 16-parameter version of create_unified_payment_transaction function
-- This version has the wrong parameter order and missing p_is_card parameter
DROP FUNCTION IF EXISTS public.create_unified_payment_transaction(
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
  p_card_brand text, 
  p_card_last_four text, 
  p_bank_last_four text, 
  p_first_name text, 
  p_last_name text, 
  p_user_email text
);
