-- Phase 1: Final Database Function Cleanup
-- Drop remaining bill-related database functions

-- Drop smart bill matching function
DROP FUNCTION IF EXISTS public.smart_bill_matching(uuid, uuid);

-- Drop automatic bill matching trigger function
DROP FUNCTION IF EXISTS public.trigger_automatic_bill_matching() CASCADE;