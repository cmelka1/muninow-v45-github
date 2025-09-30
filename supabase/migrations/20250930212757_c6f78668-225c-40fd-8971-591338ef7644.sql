-- Phase 2: Database Schema Cleanup
-- Remove bill_id from payment_transactions table
ALTER TABLE public.payment_transactions DROP COLUMN IF EXISTS bill_id;

-- Drop legacy bill-related tables if they exist
DROP TABLE IF EXISTS public.user_bill_payment_instruments CASCADE;

-- Drop legacy bill-matching function if it exists  
DROP FUNCTION IF EXISTS public.smart_bill_matching(uuid, text, text, text, text, text) CASCADE;