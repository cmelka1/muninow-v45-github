-- Fix merchants table constraints and defaults
ALTER TABLE public.merchants 
  ALTER COLUMN mcc_code DROP DEFAULT;

-- Add check constraint for ownership_type
ALTER TABLE public.merchants 
  ADD CONSTRAINT merchants_ownership_type_check 
  CHECK (ownership_type IN ('private', 'public'));

-- Remove the unique constraint on user_id to allow multiple applications per user
ALTER TABLE public.merchants 
  DROP CONSTRAINT IF EXISTS merchants_user_id_key;