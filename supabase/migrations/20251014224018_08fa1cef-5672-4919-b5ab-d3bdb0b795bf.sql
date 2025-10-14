-- Phase 1.1: Make payment_transaction_id NOT NULL
-- First, check if any NULL values exist and clean them up
DELETE FROM refunds WHERE payment_transaction_id IS NULL;

-- Make the column NOT NULL
ALTER TABLE refunds 
ALTER COLUMN payment_transaction_id SET NOT NULL;

-- Phase 1.3: Add Performance Indexes
-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_refunds_payment_transaction_id 
ON refunds(payment_transaction_id);

CREATE INDEX IF NOT EXISTS idx_refunds_customer_id 
ON refunds(customer_id);

CREATE INDEX IF NOT EXISTS idx_refunds_user_id 
ON refunds(user_id);

CREATE INDEX IF NOT EXISTS idx_refunds_status 
ON refunds(refund_status);

CREATE INDEX IF NOT EXISTS idx_refunds_created_at 
ON refunds(created_at DESC);

-- Composite index for municipal users looking up refunds by customer and status
CREATE INDEX IF NOT EXISTS idx_refunds_customer_status 
ON refunds(customer_id, refund_status);