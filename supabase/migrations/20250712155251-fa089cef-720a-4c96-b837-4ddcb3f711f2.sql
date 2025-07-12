-- Update master_bills with profile and finix identity information
UPDATE master_bills 
SET 
  first_name = p.first_name,
  last_name = p.last_name,
  email = p.email,
  street_address = p.street_address,
  apt_number = p.apt_number,
  city = p.city,
  state = p.state,
  zip_code = p.zip_code,
  account_type = p.account_type,
  finix_identity_id = fi.finix_identity_id,
  updated_at = NOW()
FROM profiles p
LEFT JOIN finix_identities fi ON fi.user_id = p.id
WHERE master_bills.profile_id = p.id
  AND master_bills.profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.created_by_system = 'BILL_GENERATOR_v1.0';