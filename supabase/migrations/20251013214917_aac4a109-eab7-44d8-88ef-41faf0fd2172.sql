-- Add merchant fee profile data to all affected service application records

-- Update stuck record with complete fee profile data
UPDATE municipal_service_applications
SET 
  merchant_id = '3d8dc10e-d548-4804-a6fb-68e6f89d9412',
  merchant_fee_profile_id = '47208b0d-27cf-4e0d-a852-a823692dad66',
  basis_points = 300,
  fixed_fee = 50,
  ach_basis_points = 150,
  ach_fixed_fee = 50,
  updated_at = now()
WHERE id = '02c9848c-c93f-475c-b99d-a94e28393d06';

-- Fix historical record 1: Calculate correct fees (base 2500 cents)
-- Service fee = (2500 * 300 / 10000) + 50 = 75 + 50 = 125 cents
-- Total = 2500 + 125 = 2625 cents
UPDATE municipal_service_applications
SET 
  merchant_id = '3d8dc10e-d548-4804-a6fb-68e6f89d9412',
  merchant_fee_profile_id = '47208b0d-27cf-4e0d-a852-a823692dad66',
  basis_points = 300,
  fixed_fee = 50,
  ach_basis_points = 150,
  ach_fixed_fee = 50,
  payment_type = 'PAYMENT_CARD',
  service_fee_cents = 125,
  total_amount_cents = 2625,
  updated_at = now()
WHERE id = 'fe614692-5b26-4d30-833b-f59e71003dfa';

-- Fix historical record 2: Calculate correct fees (base 5000 cents)
-- Service fee = (5000 * 300 / 10000) + 50 = 150 + 50 = 200 cents
-- Total = 5000 + 200 = 5200 cents
UPDATE municipal_service_applications
SET 
  merchant_fee_profile_id = '47208b0d-27cf-4e0d-a852-a823692dad66',
  basis_points = 300,
  fixed_fee = 50,
  ach_basis_points = 150,
  ach_fixed_fee = 50,
  payment_type = 'PAYMENT_CARD',
  service_fee_cents = 200,
  total_amount_cents = 5200,
  updated_at = now()
WHERE id = '81adc4bf-4eb8-40ff-b210-5117244cfd99';

-- Fix historical record 3: Calculate correct fees (base 2500 cents)
-- Service fee = (2500 * 300 / 10000) + 50 = 75 + 50 = 125 cents
-- Total = 2500 + 125 = 2625 cents
UPDATE municipal_service_applications
SET 
  merchant_fee_profile_id = '47208b0d-27cf-4e0d-a852-a823692dad66',
  basis_points = 300,
  fixed_fee = 50,
  ach_basis_points = 150,
  ach_fixed_fee = 50,
  payment_type = 'PAYMENT_CARD',
  service_fee_cents = 125,
  total_amount_cents = 2625,
  updated_at = now()
WHERE id = '4ebc06f8-4f8a-4d78-9250-cdc5ee817207';

-- Verify all records are now complete
DO $$
DECLARE
  incomplete_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO incomplete_count
  FROM municipal_service_applications
  WHERE payment_status = 'paid' 
    AND (payment_type IS NULL OR merchant_fee_profile_id IS NULL);
  
  IF incomplete_count > 0 THEN
    RAISE NOTICE 'Still have % incomplete paid service applications', incomplete_count;
  ELSE
    RAISE NOTICE 'All paid service applications now have complete payment data';
  END IF;
END $$;