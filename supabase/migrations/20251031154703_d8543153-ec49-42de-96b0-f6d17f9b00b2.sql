-- ========================================
-- PAYMENT STATUS STANDARDIZATION MIGRATION  
-- ========================================
-- This migration standardizes payment_status values across all tables
-- and simplifies the payment_status_enum to only: paid, unpaid
--
-- Data Changes:
-- - 10 permits: pending → unpaid
-- - 1 tax submission: pending → unpaid  
-- - 26 payment transactions: completed → paid
-- - 2 payment transactions: pending → unpaid
--
-- Tables affected:
-- - permit_applications
-- - business_license_applications
-- - tax_submissions
-- - municipal_service_applications
-- - payment_transactions
-- ========================================

-- STEP 1: Update data in all tables FIRST (while still TEXT type)
-- Convert pending → unpaid, partially_paid → unpaid, completed → paid

UPDATE permit_applications
SET payment_status = 'unpaid'
WHERE payment_status IN ('pending', 'partially_paid');

UPDATE business_license_applications
SET payment_status = 'unpaid'
WHERE payment_status IN ('pending', 'partially_paid');

UPDATE tax_submissions
SET payment_status = 'unpaid'
WHERE payment_status IN ('pending', 'partially_paid');

UPDATE municipal_service_applications
SET payment_status = 'unpaid'
WHERE payment_status IN ('pending', 'partially_paid');

UPDATE payment_transactions
SET payment_status = 'paid'
WHERE payment_status = 'completed';

UPDATE payment_transactions
SET payment_status = 'unpaid'
WHERE payment_status = 'pending';

-- STEP 2: Drop the old enum if it exists
DROP TYPE IF EXISTS payment_status_enum CASCADE;

-- STEP 3: Create new clean enum with only paid/unpaid
CREATE TYPE payment_status_enum AS ENUM ('paid', 'unpaid');

-- STEP 4: Columns are already TEXT type, so no conversion needed
-- The schema shows payment_status is already text type with defaults

-- Migration complete - payment_status columns remain as TEXT type
-- which is more flexible than enum for this use case