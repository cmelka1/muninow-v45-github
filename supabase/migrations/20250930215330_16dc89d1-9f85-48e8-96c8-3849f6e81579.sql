-- Phase 2: Final Database Schema Cleanup
-- Remove bill_id from refunds table if it exists
ALTER TABLE public.refunds DROP COLUMN IF EXISTS bill_id;

-- Clean up any remaining bill-related indexes
DROP INDEX IF EXISTS idx_refunds_bill_id;