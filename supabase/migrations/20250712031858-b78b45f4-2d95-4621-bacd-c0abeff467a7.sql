-- Remove card_bin column from user_payment_instruments table for PCI compliance
ALTER TABLE public.user_payment_instruments DROP COLUMN IF EXISTS card_bin;