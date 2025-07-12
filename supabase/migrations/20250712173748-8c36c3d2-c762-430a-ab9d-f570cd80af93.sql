-- Add customer_id column to payment_history table
ALTER TABLE public.payment_history 
ADD COLUMN customer_id UUID;

-- Backfill customer_id from master_bills for existing records
UPDATE public.payment_history 
SET customer_id = mb.customer_id
FROM public.master_bills mb
WHERE payment_history.bill_id = mb.bill_id;