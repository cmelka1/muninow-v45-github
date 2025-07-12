-- Update master_bills with merchant information from statement_descriptor to fee-related fields
-- This includes data from merchants, merchant_payout_profiles, and merchant_fee_profiles tables

-- Step 1: Update statement_descriptor from merchants table
UPDATE master_bills 
SET 
  statement_descriptor = merchants.statement_descriptor,
  updated_at = NOW()
FROM merchants
WHERE master_bills.merchant_id = merchants.id
  AND master_bills.profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.created_by_system = 'BILL_GENERATOR_v1.0';

-- Step 2: Update payout profile information from merchant_payout_profiles table
UPDATE master_bills 
SET 
  finix_payout_profile_id = mpp.finix_payout_profile_id,
  updated_at = NOW()
FROM merchant_payout_profiles mpp
WHERE master_bills.merchant_id = mpp.merchant_id
  AND master_bills.profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.created_by_system = 'BILL_GENERATOR_v1.0';

-- Step 3: Update fee profile information from merchant_fee_profiles table
-- Use the first fee profile for each merchant (there might be multiple)
UPDATE master_bills 
SET 
  finix_fee_profile_id = mfp.finix_fee_profile_id,
  basis_points = mfp.basis_points,
  fixed_fee = mfp.fixed_fee,
  ach_basis_points = mfp.ach_basis_points,
  ach_fixed_fee = mfp.ach_fixed_fee,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (merchant_id) 
    merchant_id,
    finix_fee_profile_id,
    basis_points,
    fixed_fee,
    ach_basis_points,
    ach_fixed_fee
  FROM merchant_fee_profiles 
  ORDER BY merchant_id, created_at DESC
) mfp
WHERE master_bills.merchant_id = mfp.merchant_id
  AND master_bills.profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND master_bills.created_by_system = 'BILL_GENERATOR_v1.0';