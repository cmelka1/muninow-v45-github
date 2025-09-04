-- Step 1: Convert columns to text temporarily to avoid enum conflicts
ALTER TABLE permit_applications ALTER COLUMN payment_status TYPE text;
ALTER TABLE master_bills ALTER COLUMN payment_status TYPE text;

-- Step 2: Clean up the data 
UPDATE permit_applications SET payment_status = 'unpaid' WHERE payment_status IN ('pending', 'partially_paid');
UPDATE master_bills SET payment_status = 'unpaid' WHERE payment_status = 'partially_paid';

-- Step 3: Drop the old enum
DROP TYPE payment_status_enum;

-- Step 4: Create new enum with only paid and unpaid
CREATE TYPE payment_status_enum AS ENUM ('paid', 'unpaid');

-- Step 5: Convert columns back to the new enum
ALTER TABLE permit_applications 
ALTER COLUMN payment_status TYPE payment_status_enum USING payment_status::payment_status_enum;

ALTER TABLE master_bills 
ALTER COLUMN payment_status TYPE payment_status_enum USING payment_status::payment_status_enum;

-- Step 6: Set defaults
ALTER TABLE permit_applications ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE master_bills ALTER COLUMN payment_status SET DEFAULT 'unpaid';