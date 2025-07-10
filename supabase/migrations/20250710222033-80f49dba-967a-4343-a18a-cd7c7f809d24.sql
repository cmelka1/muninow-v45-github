-- Drop Municipal Bills Table and Related Artifacts (Fixed)
-- This migration removes the obsolete municipal_bills table since all data has been migrated to master_bills

-- Step 1: Drop functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.update_municipal_bill_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.update_municipality_name() CASCADE;
DROP FUNCTION IF EXISTS public.insert_bills_for_cmelka_accounts(text) CASCADE;

-- Step 2: Drop the municipal_bills table
DROP TABLE IF EXISTS municipal_bills CASCADE;

-- Step 3: Log completion
DO $$
BEGIN
  RAISE NOTICE 'Municipal bills table cleanup completed successfully';
  RAISE NOTICE 'All bill data is now available in master_bills table';
END $$;