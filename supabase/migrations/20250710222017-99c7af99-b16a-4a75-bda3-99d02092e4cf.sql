-- Drop Municipal Bills Table and Related Artifacts
-- This migration removes the obsolete municipal_bills table since all data has been migrated to master_bills

-- Step 1: Drop triggers that reference municipal_bills
DROP TRIGGER IF EXISTS update_municipal_bill_timestamp_trigger ON municipal_bills;
DROP TRIGGER IF EXISTS update_municipality_name_trigger ON municipal_bills;

-- Step 2: Drop functions that reference municipal_bills
DROP FUNCTION IF EXISTS public.update_municipal_bill_timestamp();
DROP FUNCTION IF EXISTS public.update_municipality_name();
DROP FUNCTION IF EXISTS public.insert_bills_for_cmelka_accounts(text);

-- Step 3: Drop the municipal_bills table
DROP TABLE IF EXISTS municipal_bills;

-- Step 4: Clean up municipal sequence counters if no longer needed
-- Keep this table as it might be used for future bill numbering in master_bills
-- DROP TABLE IF EXISTS municipal_sequence_counters;

-- Step 5: Log completion
DO $$
BEGIN
  RAISE NOTICE 'Municipal bills table cleanup completed successfully';
  RAISE NOTICE 'All bill data is now available in master_bills table';
END $$;