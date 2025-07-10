-- Data Migration: Transfer municipal_bills to master_bills
-- This migration moves existing bills from municipal_bills to the new master_bills table

-- Insert existing municipal bills into master_bills with field mapping
INSERT INTO master_bills (
  -- Identity & Tracking
  external_bill_number,
  external_account_number,
  data_source_system,
  customer_id,
  
  -- Core Bill Data (convert dollars to cents)
  amount_due_cents,
  original_amount_cents,
  remaining_balance_cents,
  total_amount_cents,
  
  -- Dates & Timestamps
  issue_date,
  due_date,
  past_due_date,
  created_at,
  updated_at,
  
  -- Status & Categories
  bill_status,
  payment_status,
  category,
  
  -- Customer Information
  legal_entity_name,
  doing_business_as,
  
  -- User Profile Information (Bill Payer)
  profile_id,
  user_id,
  first_name,
  last_name,
  email,
  street_address,
  city,
  state,
  zip_code,
  account_type,
  business_legal_name,
  
  -- Merchant Information
  merchant_name,
  
  -- System-Specific Data
  bill_specific_data,
  usage_details,
  
  -- Processing & Audit Trail
  processing_status,
  created_by_system
)
SELECT
  -- Identity & Tracking
  COALESCE(bill_number, receipt_code, id) as external_bill_number,
  vendor_account_number as external_account_number,
  'municipal_bills_legacy' as data_source_system,
  COALESCE(municipality_id::text, 'unknown') as customer_id,
  
  -- Core Bill Data (convert dollars to cents)
  ROUND(amount_due * 100)::bigint as amount_due_cents,
  ROUND(amount_due * 100)::bigint as original_amount_cents,
  CASE 
    WHEN payment_status = 'paid' THEN 0
    ELSE ROUND(amount_due * 100)::bigint
  END as remaining_balance_cents,
  ROUND(amount_due * 100)::bigint as total_amount_cents,
  
  -- Dates & Timestamps
  issue_date,
  due_date,
  delinquency_date as past_due_date,
  created_at,
  updated_at,
  
  -- Status & Categories
  CASE 
    WHEN status = 'paid' THEN 'paid'::bill_status_enum
    WHEN status = 'overdue' THEN 'overdue'::bill_status_enum
    WHEN status = 'delinquent' THEN 'delinquent'::bill_status_enum
    WHEN status = 'cancelled' THEN 'cancelled'::bill_status_enum
    ELSE 'unpaid'::bill_status_enum
  END as bill_status,
  CASE 
    WHEN payment_status = 'paid' THEN 'paid'::payment_status_enum
    ELSE 'unpaid'::payment_status_enum
  END as payment_status,
  category,
  
  -- Customer Information
  business_legal_name as legal_entity_name,
  business_legal_name as doing_business_as,
  
  -- User Profile Information (Bill Payer)  
  user_id::text as profile_id,
  user_id,
  first_name,
  last_name,
  user_email as email,
  address as street_address,
  SPLIT_PART(address, ', ', 2) as city,
  SPLIT_PART(address, ', ', 3) as state,
  service_zip_code as zip_code,
  account_type,
  business_legal_name,
  
  -- Merchant Information
  vendor as merchant_name,
  
  -- System-Specific Data
  jsonb_build_object(
    'bill_number', bill_number,
    'receipt_code', receipt_code,
    'vendor_account_number', vendor_account_number,
    'vendor_territory_code', vendor_territory_code,
    'service_address', service_address,
    'notifications', notifications,
    'payment_history', payment_history,
    'legacy_id', id,
    'municipality_id', municipality_id,
    'system_id', system_id,
    'sequence_number', sequence_number,
    'transaction_id', transaction_id,
    'idempotency_id', idempotency_id,
    'finix_merchant_id', finix_merchant_id,
    'fraud_session_id', fraud_session_id,
    'finix_transfer_id', finix_transfer_id,
    'payment_method_type', payment_method_type,
    'payment_confirmation_number', payment_confirmation_number,
    'municipality_name', municipality_name,
    'municipality_routing_status', municipality_routing_status,
    'routing_confidence_score', routing_confidence_score,
    'manual_municipality_override', manual_municipality_override,
    'is_payable', is_payable,
    'turn_off_date', turn_off_date,
    'paid_at', paid_at
  ) as bill_specific_data,
  usage_details,
  
  -- Processing & Audit Trail
  'migrated' as processing_status,
  'municipal_bills_migration' as created_by_system

FROM municipal_bills
WHERE user_id IS NOT NULL; -- Only migrate bills that have user assignments

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM master_bills WHERE created_by_system = 'municipal_bills_migration';
  SELECT COUNT(*) INTO total_count FROM municipal_bills;
  
  RAISE NOTICE 'Migration completed: % bills migrated out of % total bills', migrated_count, total_count;
END $$;

-- Run smart matching on all migrated bills
DO $$
DECLARE
  bill_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  FOR bill_record IN 
    SELECT bill_id FROM master_bills 
    WHERE created_by_system = 'municipal_bills_migration'
  LOOP
    -- Run smart matching for each migrated bill
    PERFORM smart_bill_matching(bill_record.bill_id);
    processed_count := processed_count + 1;
    
    -- Log progress every 20 bills
    IF processed_count % 20 = 0 THEN
      RAISE NOTICE 'Smart matching progress: % bills processed', processed_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Smart matching completed for % migrated bills', processed_count;
END $$;

-- Create summary view of migration results
CREATE TEMPORARY VIEW migration_summary AS
SELECT 
  'Total Migrated Bills' as metric,
  COUNT(*) as count
FROM master_bills 
WHERE created_by_system = 'municipal_bills_migration'

UNION ALL

SELECT 
  'Auto-Assigned Bills' as metric,
  COUNT(*) as count
FROM master_bills 
WHERE created_by_system = 'municipal_bills_migration'
  AND assignment_status = 'assigned'

UNION ALL

SELECT 
  'Pending Review Bills' as metric,
  COUNT(*) as count
FROM master_bills 
WHERE created_by_system = 'municipal_bills_migration'
  AND assignment_status = 'pending_review'

UNION ALL

SELECT 
  'Unassigned Bills' as metric,
  COUNT(*) as count
FROM master_bills 
WHERE created_by_system = 'municipal_bills_migration'
  AND assignment_status = 'unassigned';

-- Display migration summary
SELECT * FROM migration_summary;