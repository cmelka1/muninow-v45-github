-- Drop any overloaded versions of create_tax_submission_with_payment that include a jsonb parameter
-- This ensures PostgREST sees only the correct, text-based function
BEGIN;

-- Redundant explicit drop for the commonly seen legacy signature (jsonb 9th arg)
DROP FUNCTION IF EXISTS public.create_tax_submission_with_payment(
  uuid, uuid, uuid, text, date, date, integer, bigint, jsonb, text, text, bigint, bigint, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
);

-- Dynamic cleanup: find and drop any remaining jsonb-based overloads
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_tax_submission_with_payment'
  LOOP
    -- If the identity arguments contain jsonb, it's a legacy variant we want to drop
    IF position('jsonb' in r.args) > 0 THEN
      RAISE NOTICE 'Dropping legacy function: %(%).', r.proname, r.args;
      EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s);', r.proname, r.args);
    END IF;
  END LOOP;
END $$;

COMMIT;