-- Add bank_last_four column to payment_history table
ALTER TABLE public.payment_history ADD COLUMN bank_last_four text;

-- Populate existing records with bank_last_four from user_payment_instruments for bank account payments
UPDATE public.payment_history 
SET bank_last_four = upi.bank_last_four
FROM public.user_payment_instruments upi 
WHERE payment_history.finix_payment_instrument_id = upi.finix_payment_instrument_id 
  AND upi.instrument_type = 'BANK_ACCOUNT'
  AND payment_history.bank_last_four IS NULL;