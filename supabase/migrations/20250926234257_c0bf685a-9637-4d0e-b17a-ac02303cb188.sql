-- Phase 1: Update refunds table schema and clear payment_history data

-- Add payment_transaction_id column to refunds table
ALTER TABLE public.refunds 
ADD COLUMN payment_transaction_id uuid REFERENCES public.payment_transactions(id);

-- Make payment_history_id nullable to allow data clearing
ALTER TABLE public.refunds 
ALTER COLUMN payment_history_id DROP NOT NULL;

-- Update existing refunds to clear payment_history_id references
UPDATE public.refunds 
SET payment_history_id = NULL 
WHERE payment_history_id IS NOT NULL;

-- Clear all data from payment_history table
TRUNCATE TABLE public.payment_history;