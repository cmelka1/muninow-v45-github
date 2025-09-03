-- Update payment_status_enum to only allow 'paid' and 'unpaid'
-- Remove 'partially_paid' option since partial payments are not allowed

-- First, update any existing 'partially_paid' records to 'unpaid'
UPDATE master_bills SET payment_status = 'unpaid' WHERE payment_status = 'partially_paid';

-- Drop the existing enum and recreate with only paid/unpaid
DROP TYPE IF EXISTS payment_status_enum CASCADE;
CREATE TYPE payment_status_enum AS ENUM ('paid', 'unpaid');

-- Recreate the columns that use this enum
ALTER TABLE master_bills 
  ALTER COLUMN payment_status TYPE payment_status_enum 
  USING payment_status::text::payment_status_enum;

-- Set default to 'unpaid'
ALTER TABLE master_bills 
  ALTER COLUMN payment_status SET DEFAULT 'unpaid'::payment_status_enum;