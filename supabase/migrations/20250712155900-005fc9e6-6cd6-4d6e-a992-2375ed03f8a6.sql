-- Randomly assign merchant_id from available merchants and populate corresponding merchant data
-- Step 1: Randomly assign merchant_id to bills without one using hash-based distribution
UPDATE master_bills 
SET 
  merchant_id = (
    CASE 
      WHEN hashtext(bill_id::text) % 3 = 0 THEN '4ffd550f-edcd-4f48-8565-f8401c197209'::uuid
      WHEN hashtext(bill_id::text) % 3 = 1 THEN 'dfc7782d-6e2a-4201-9c12-35c8925add4b'::uuid
      ELSE '70111580-dfcb-4b3c-b460-7d798e9a0870'::uuid
    END
  ),
  updated_at = NOW()
WHERE master_bills.profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.created_by_system = 'BILL_GENERATOR_v1.0'
  AND master_bills.merchant_id IS NULL;

-- Step 2: Update merchant data based on the assigned merchant_id
UPDATE master_bills 
SET 
  merchant_name = merchants.merchant_name,
  finix_merchant_id = merchants.finix_merchant_id,
  finix_merchant_profile_id = merchants.finix_merchant_profile_id,
  merchant_finix_identity_id = merchants.finix_identity_id,
  updated_at = NOW()
FROM merchants
WHERE master_bills.merchant_id = merchants.id
  AND master_bills.profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.created_by_system = 'BILL_GENERATOR_v1.0';