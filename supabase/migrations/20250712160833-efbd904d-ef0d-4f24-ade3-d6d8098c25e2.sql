-- Update master_bills with external customer information aligned with profile data
UPDATE master_bills 
SET 
  external_customer_name = 'charles melka',
  external_customer_address_line1 = '8472 Dolfor Cove',
  external_customer_address_line2 = 'Penthouse',
  external_customer_city = 'Burr Ridge',
  external_customer_state = 'IL',
  external_customer_zip_code = '60527',
  external_customer_type = 'resident',
  updated_at = NOW()
WHERE profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND created_by_system = 'BILL_GENERATOR_v1.0';