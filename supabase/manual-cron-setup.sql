-- ============================================================================
-- MANUAL CRON SCHEDULE SETUP FOR ABANDONED BOOKING CLEANUP
-- ============================================================================
-- 
-- IMPORTANT: This SQL must be executed manually in the Supabase SQL Editor
-- because cron schedules are user-specific and should not be in migrations.
--
-- Instructions:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to the SQL Editor
-- 3. Copy and paste the SQL below
-- 4. Click "Run" to execute
-- 5. Verify the schedule was created by checking the cron.job table
--
-- ============================================================================

-- First, verify the cleanup function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'cleanup_abandoned_bookings' 
  AND pronamespace = 'public'::regnamespace
) AS function_exists;

-- Check if the schedule already exists (to avoid duplicates)
SELECT * FROM cron.job WHERE jobname = 'cleanup-abandoned-bookings-every-15-min';

-- If the schedule doesn't exist, create it
-- This will run the cleanup function every 15 minutes
SELECT cron.schedule(
  'cleanup-abandoned-bookings-every-15-min',
  '*/15 * * * *',  -- Every 15 minutes
  $$SELECT public.cleanup_abandoned_bookings()$$
);

-- Verify the schedule was created successfully
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'cleanup-abandoned-bookings-every-15-min';

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
--
-- If you need to delete the schedule and recreate it:
-- SELECT cron.unschedule('cleanup-abandoned-bookings-every-15-min');
--
-- To manually test the cleanup function:
-- SELECT public.cleanup_abandoned_bookings();
--
-- To view all cron jobs:
-- SELECT * FROM cron.job;
--
-- ============================================================================
