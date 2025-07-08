-- Fix merchants table constraints and defaults
ALTER TABLE public.merchants 
  ALTER COLUMN mcc_code DROP DEFAULT;

-- Drop existing ownership_type constraint if it exists and recreate it
ALTER TABLE public.merchants 
  DROP CONSTRAINT IF EXISTS merchants_ownership_type_check;

ALTER TABLE public.merchants 
  ADD CONSTRAINT merchants_ownership_type_check 
  CHECK (ownership_type IN ('private', 'public'));

-- Update bank account type constraint to include all four types
ALTER TABLE public.merchants 
  DROP CONSTRAINT IF EXISTS merchants_bank_account_type_check;

ALTER TABLE public.merchants 
  ADD CONSTRAINT merchants_bank_account_type_check 
  CHECK (bank_account_type IN ('business_checking', 'business_savings', 'personal_checking', 'personal_savings'));

-- Add missing field for Finix merchant response
ALTER TABLE public.merchants 
  ADD COLUMN IF NOT EXISTS level_two_level_three_data_enabled BOOLEAN;

-- Remove the unique constraint on user_id to allow multiple applications per user
ALTER TABLE public.merchants 
  DROP CONSTRAINT IF EXISTS merchants_user_id_key;