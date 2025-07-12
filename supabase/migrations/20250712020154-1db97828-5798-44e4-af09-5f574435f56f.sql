-- Fix missing finix_merchant_id and merchant_name in master_bills
-- Update bills that have a merchant_id but are missing finix_merchant_id or merchant_name

UPDATE master_bills 
SET 
  finix_merchant_id = merchants.finix_merchant_id,
  merchant_name = merchants.merchant_name
FROM merchants 
WHERE master_bills.merchant_id = merchants.id 
  AND (
    master_bills.finix_merchant_id IS NULL 
    OR master_bills.merchant_name IS NULL
  )
  AND merchants.finix_merchant_id IS NOT NULL;

-- Create a function to automatically sync merchant data to bills
CREATE OR REPLACE FUNCTION sync_bill_merchant_data()
RETURNS TRIGGER AS $$
BEGIN
  -- When a bill is inserted or updated with a merchant_id, sync the merchant data
  IF NEW.merchant_id IS NOT NULL THEN
    UPDATE master_bills 
    SET 
      finix_merchant_id = merchants.finix_merchant_id,
      merchant_name = merchants.merchant_name
    FROM merchants 
    WHERE master_bills.bill_id = NEW.bill_id
      AND merchants.id = NEW.merchant_id
      AND merchants.finix_merchant_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync merchant data when bills are inserted/updated
DROP TRIGGER IF EXISTS trigger_sync_bill_merchant_data ON master_bills;
CREATE TRIGGER trigger_sync_bill_merchant_data
  AFTER INSERT OR UPDATE OF merchant_id
  ON master_bills
  FOR EACH ROW
  EXECUTE FUNCTION sync_bill_merchant_data();

-- Create function to sync all related bills when a merchant's finix data is updated
CREATE OR REPLACE FUNCTION sync_merchant_to_bills()
RETURNS TRIGGER AS $$
BEGIN
  -- When a merchant's finix_merchant_id is updated, sync to all related bills
  IF NEW.finix_merchant_id IS NOT NULL AND (OLD.finix_merchant_id IS NULL OR OLD.finix_merchant_id != NEW.finix_merchant_id) THEN
    UPDATE master_bills 
    SET 
      finix_merchant_id = NEW.finix_merchant_id,
      merchant_name = NEW.merchant_name
    WHERE merchant_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync bills when merchant finix data is updated
DROP TRIGGER IF EXISTS trigger_sync_merchant_to_bills ON merchants;
CREATE TRIGGER trigger_sync_merchant_to_bills
  AFTER UPDATE OF finix_merchant_id, merchant_name
  ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION sync_merchant_to_bills();