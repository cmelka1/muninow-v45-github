-- Drop the old 16-parameter version of create_unified_payment_transaction function
-- This keeps only the corrected 17-parameter version with proper entity mapping

DROP FUNCTION IF EXISTS public.create_unified_payment_transaction(
  uuid, uuid, uuid, text, uuid, bigint, bigint, bigint, text, text, text, text, text, text, text, text
);