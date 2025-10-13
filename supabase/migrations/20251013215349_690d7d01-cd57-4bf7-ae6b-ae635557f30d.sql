-- Fix incomplete business license payment data

-- Fix record 1: da128e0c-0d40-4579-a355-1bfd2d7ba4b3 (LAK-2025-000001)
-- Calculate correct fees: base 7500 cents
-- Service fee = (7500 * 300 / 10000) + 50 = 225 + 50 = 275 cents
-- Total = 7500 + 275 = 7775 cents
UPDATE business_license_applications
SET 
  payment_type = 'PAYMENT_CARD',
  service_fee_cents = 275,
  total_amount_cents = 7775,
  updated_at = now()
WHERE id = 'da128e0c-0d40-4579-a355-1bfd2d7ba4b3';

-- Fix record 2: 625c9bb5-3795-44aa-83ea-4062b15bb88e (LAK-2025-000004)
-- Fees already correct, just set payment_type
UPDATE business_license_applications
SET 
  payment_type = 'PAYMENT_CARD',
  updated_at = now()
WHERE id = '625c9bb5-3795-44aa-83ea-4062b15bb88e';

-- Verify all paid business licenses now have complete payment data
DO $$
DECLARE
  incomplete_count INTEGER;
  zero_fee_count INTEGER;
  inconsistent_count INTEGER;
BEGIN
  -- Check for NULL payment_type
  SELECT COUNT(*) INTO incomplete_count
  FROM business_license_applications
  WHERE payment_status = 'paid' 
    AND payment_type IS NULL;
  
  -- Check for zero service fees
  SELECT COUNT(*) INTO zero_fee_count
  FROM business_license_applications
  WHERE payment_status = 'paid' 
    AND (service_fee_cents = 0 OR service_fee_cents IS NULL);
  
  -- Check for inconsistent totals
  SELECT COUNT(*) INTO inconsistent_count
  FROM business_license_applications
  WHERE payment_status = 'paid' 
    AND total_amount_cents != (base_amount_cents + COALESCE(service_fee_cents, 0));
  
  IF incomplete_count > 0 OR zero_fee_count > 0 OR inconsistent_count > 0 THEN
    RAISE NOTICE 'Issues found: % NULL payment_type, % zero fees, % inconsistent totals', 
      incomplete_count, zero_fee_count, inconsistent_count;
  ELSE
    RAISE NOTICE 'All paid business license applications now have complete and consistent payment data';
  END IF;
END $$;