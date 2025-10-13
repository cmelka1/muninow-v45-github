-- ============================================================================
-- Migration 003: Fix Idempotency System
-- Purpose: Improve idempotency with UNIQUE constraint and proper column setup
-- Breaking: NO - Safe migration with backfill strategy
-- ============================================================================

-- Step 1: Make idempotency_id nullable (deprecate legacy field)
ALTER TABLE payment_transactions
  ALTER COLUMN idempotency_id DROP NOT NULL,
  ALTER COLUMN idempotency_id SET DEFAULT NULL;

COMMENT ON COLUMN payment_transactions.idempotency_id IS 
  'DEPRECATED: Legacy idempotency field. Use idempotency_uuid instead. Kept for backward compatibility during migration.';

-- Step 2: Backfill any NULL idempotency_uuid values (safety measure)
UPDATE payment_transactions
SET idempotency_uuid = gen_random_uuid()
WHERE idempotency_uuid IS NULL;

-- Step 3: Make idempotency_uuid NOT NULL (now required)
ALTER TABLE payment_transactions
  ALTER COLUMN idempotency_uuid SET NOT NULL;

COMMENT ON COLUMN payment_transactions.idempotency_uuid IS 
  'Deterministic UUID for payment idempotency. Generated using UUIDv5 from entity details, user, session, amount, and payment instrument. Ensures proper duplicate payment prevention.';

-- Step 4: Add UNIQUE constraint to prevent duplicate payments
-- This is the critical security fix
ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_idempotency_uuid_unique 
  UNIQUE (idempotency_uuid);

COMMENT ON COLUMN payment_transactions.idempotency_metadata IS 
  'Comprehensive metadata for debugging idempotency issues. Includes session, entity details, payment method, client info, and version tracking.';