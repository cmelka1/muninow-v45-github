-- Populate card_brand and card_last_four for existing payment history records
UPDATE public.payment_history 
SET 
  card_brand = upi.card_brand,
  card_last_four = upi.card_last_four
FROM public.user_payment_instruments upi
WHERE payment_history.finix_payment_instrument_id = upi.finix_payment_instrument_id
  AND payment_history.payment_type IN ('Card', 'Google Pay', 'Apple Pay')
  AND upi.instrument_type = 'PAYMENT_CARD'
  AND payment_history.card_brand IS NULL;