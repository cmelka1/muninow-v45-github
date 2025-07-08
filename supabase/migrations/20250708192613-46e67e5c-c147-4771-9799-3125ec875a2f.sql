
-- Add merchant_name column to store the user-chosen merchant name from Step 1
ALTER TABLE public.merchants 
  ADD COLUMN merchant_name TEXT NOT NULL DEFAULT '';

-- Update the default to be empty string temporarily, then remove default
-- This allows existing records to have a value while making it required for new records
ALTER TABLE public.merchants 
  ALTER COLUMN merchant_name DROP DEFAULT;

-- Add a comment to clarify the distinction between columns
COMMENT ON COLUMN public.merchants.merchant_name IS 'User-chosen merchant name submitted in Step 1 of merchant creation form';
COMMENT ON COLUMN public.merchants.business_name IS 'Legal business name from customer onboarding data';
