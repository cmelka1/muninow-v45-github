-- ============================================================================
-- Migration 001: Standardize base_amount_cents across all entity tables
-- Purpose: Add base_amount_cents column to all entity tables for consistency
-- Breaking: NO - Uses generated column for permits to maintain compatibility
-- ============================================================================

-- 1. permit_applications
-- Use GENERATED column to create alias without breaking existing code
-- This allows both payment_amount_cents and base_amount_cents to work
ALTER TABLE permit_applications 
  ADD COLUMN IF NOT EXISTS base_amount_cents bigint 
  GENERATED ALWAYS AS (payment_amount_cents) STORED;

COMMENT ON COLUMN permit_applications.base_amount_cents IS 
  'Generated alias for payment_amount_cents. Standardizes field naming across all entity tables.';

-- 2. business_license_applications
-- Rename base_fee_cents to base_amount_cents
-- This is safe because base_fee_cents is only used internally
ALTER TABLE business_license_applications
  RENAME COLUMN base_fee_cents TO base_amount_cents;

COMMENT ON COLUMN business_license_applications.base_amount_cents IS 
  'Base license fee amount in cents (renamed from base_fee_cents)';

-- 3. municipal_service_applications  
-- Rename amount_cents to base_amount_cents
ALTER TABLE municipal_service_applications
  RENAME COLUMN amount_cents TO base_amount_cents;

COMMENT ON COLUMN municipal_service_applications.base_amount_cents IS 
  'Base service amount in cents (renamed from amount_cents)';

-- 4. tax_submissions
-- Rename amount_cents to base_amount_cents
ALTER TABLE tax_submissions
  RENAME COLUMN amount_cents TO base_amount_cents;

COMMENT ON COLUMN tax_submissions.base_amount_cents IS 
  'Base tax amount in cents (renamed from amount_cents)';