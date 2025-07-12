-- Remove the random external_business_name from the cells
UPDATE master_bills 
SET 
  external_business_name = NULL,
  updated_at = NOW()
WHERE profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND created_by_system = 'BILL_GENERATOR_v1.0'
  AND external_business_name IS NOT NULL;