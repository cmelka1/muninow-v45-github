-- Clean up orphaned database functions (keeping fraud_session_id column)

-- Drop orphaned functions related to deleted tables
DROP FUNCTION IF EXISTS public.cleanup_expired_fraud_sessions();
DROP FUNCTION IF EXISTS public.migrate_payment_records_metadata();
DROP FUNCTION IF EXISTS public.update_payment_records_timestamp();