-- Drop the legacy create_booking_with_conflict_check function that returns jsonb
-- This resolves PGRST203 ambiguity by ensuring only the TABLE-returning version exists

DROP FUNCTION IF EXISTS public.create_booking_with_conflict_check(
  uuid, uuid, uuid, uuid, date, time, time, text, jsonb, bigint
);