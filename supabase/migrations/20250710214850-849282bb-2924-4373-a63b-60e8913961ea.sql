-- Enable the pg_trgm extension for similarity functions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create automatic bill matching trigger
CREATE OR REPLACE FUNCTION trigger_automatic_bill_matching()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the smart matching function for the newly inserted bill
  PERFORM smart_bill_matching(NEW.bill_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger that runs after each bill insert
CREATE TRIGGER automatic_bill_matching_trigger
  AFTER INSERT ON master_bills
  FOR EACH ROW
  EXECUTE FUNCTION trigger_automatic_bill_matching();

-- Run the matching function on all existing unmatched bills
DO $$
DECLARE
  bill_record RECORD;
  bills_processed INTEGER := 0;
BEGIN
  -- Process all bills that don't have match scores yet
  FOR bill_record IN 
    SELECT bill_id 
    FROM master_bills 
    WHERE match_score IS NULL OR assignment_status = 'unassigned'
  LOOP
    -- Run the smart matching function
    PERFORM smart_bill_matching(bill_record.bill_id);
    bills_processed := bills_processed + 1;
  END LOOP;
  
  RAISE NOTICE 'Processed % bills for automatic matching', bills_processed;
END $$;