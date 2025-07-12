-- Step 1: Add merchant_finix_identity_id column to master_bills
ALTER TABLE master_bills 
ADD COLUMN merchant_finix_identity_id TEXT;

-- Step 2: Populate existing records with merchant's finix_identity_id
UPDATE master_bills 
SET merchant_finix_identity_id = merchants.finix_identity_id
FROM merchants 
WHERE master_bills.merchant_id = merchants.id 
  AND merchants.finix_identity_id IS NOT NULL;

-- Step 3: Update sync_bill_merchant_data function to include merchant_finix_identity_id
CREATE OR REPLACE FUNCTION sync_bill_merchant_data()
RETURNS TRIGGER AS $$
BEGIN
  -- When a bill is inserted or updated with a merchant_id, sync the merchant data
  IF NEW.merchant_id IS NOT NULL THEN
    UPDATE master_bills 
    SET 
      finix_merchant_id = merchants.finix_merchant_id,
      merchant_name = merchants.merchant_name,
      merchant_finix_identity_id = merchants.finix_identity_id
    FROM merchants 
    WHERE master_bills.bill_id = NEW.bill_id
      AND merchants.id = NEW.merchant_id
      AND merchants.finix_identity_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update sync_merchant_to_bills function to include merchant_finix_identity_id
CREATE OR REPLACE FUNCTION sync_merchant_to_bills()
RETURNS TRIGGER AS $$
BEGIN
  -- When a merchant's finix data is updated, sync to all related bills
  IF NEW.finix_merchant_id IS NOT NULL AND (OLD.finix_merchant_id IS NULL OR OLD.finix_merchant_id != NEW.finix_merchant_id) OR
     NEW.finix_identity_id IS NOT NULL AND (OLD.finix_identity_id IS NULL OR OLD.finix_identity_id != NEW.finix_identity_id) THEN
    UPDATE master_bills 
    SET 
      finix_merchant_id = NEW.finix_merchant_id,
      merchant_name = NEW.merchant_name,
      merchant_finix_identity_id = NEW.finix_identity_id
    WHERE merchant_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;