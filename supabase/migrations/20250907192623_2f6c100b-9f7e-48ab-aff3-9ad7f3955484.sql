-- Fix payment_instrument_id column type mismatch
-- First drop the foreign key constraint, then change column type

-- Drop the foreign key constraint
ALTER TABLE public.payment_history 
DROP CONSTRAINT IF EXISTS payment_history_payment_instrument_id_fkey;

-- Change column type from uuid to text to match Finix payment instrument IDs
ALTER TABLE public.payment_history 
ALTER COLUMN payment_instrument_id TYPE text;