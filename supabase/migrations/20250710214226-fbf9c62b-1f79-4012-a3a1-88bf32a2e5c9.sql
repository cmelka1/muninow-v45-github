-- Comprehensive update to fix test bills for cmelka@gmail.com
-- Update all test bills with correct profile, address, categories, and Finix data

UPDATE master_bills 
SET 
  -- Profile information
  profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44',
  email = 'cmelka@gmail.com',
  
  -- Correct address from Charles's profile
  street_address = '8472 Dolfor Cove',
  city = 'Burr Ridge', 
  state = 'IL',
  zip_code = '60527',
  
  -- Business address (use same as personal for testing)
  business_address_line1 = '8472 Dolfor Cove',
  business_city = 'Burr Ridge',
  business_state = 'IL', 
  business_zip_code = '60527',
  
  -- Finix integration data
  finix_identity_id = 'IDk5EZZUC1HJp1XMJoCQV3rd',
  
  -- Categories - map to compliant merchant categories
  category = CASE 
    WHEN category IN ('Business License', 'Operating Permit') THEN 'Business Licenses'
    WHEN category = 'Health Permit' THEN 'Health Permits'
    WHEN category = 'Fire Safety Certificate' THEN 'Fire Inspection Fees'
    WHEN category = 'Building Permit' THEN 'Permit Fees'
    WHEN category = 'Signage Permit' THEN 'Permit Fees'
    WHEN category = 'Zoning Compliance' THEN 'Zoning & Planning Fees'
    WHEN category IN ('Parking Violation', 'Overtime Parking') THEN 'Parking Tickets'
    WHEN category = 'Speed Camera Fine' THEN 'Traffic Fines'
    WHEN category = 'Red Light Violation' THEN 'Traffic Fines'
    WHEN category = 'Equipment Violation' THEN 'Traffic Fines'
    WHEN category = 'Commercial Vehicle Fine' THEN 'Traffic Fines'
    WHEN category = 'Property Tax' THEN 'Property Taxes'
    WHEN category = 'Business Personal Property Tax' THEN 'Property Taxes'
    WHEN category = 'Sales Tax Assessment' THEN 'Property Taxes'
    WHEN category = 'Occupancy Tax' THEN 'Property Taxes'
    WHEN category = 'Franchise Tax' THEN 'Property Taxes'
    WHEN category = 'Special Assessment' THEN 'Special Assessments'
    ELSE category
  END,
  
  -- Subcategory - map to proper groupings
  subcategory = CASE 
    WHEN category IN ('Business License', 'Operating Permit', 'Health Permit', 'Fire Safety Certificate', 'Building Permit', 'Signage Permit', 'Zoning Compliance') THEN 'Licensing & Registration'
    WHEN category IN ('Parking Violation', 'Overtime Parking', 'Speed Camera Fine', 'Red Light Violation', 'Equipment Violation', 'Commercial Vehicle Fine') THEN 'Vehicle & Transportation'
    WHEN category IN ('Property Tax', 'Business Personal Property Tax', 'Sales Tax Assessment', 'Occupancy Tax', 'Franchise Tax', 'Special Assessment') THEN 'Property-Related'
    ELSE 'Other Specialized Payments'
  END,

  -- Status and processing updates
  assignment_status = 'assigned',
  data_quality_status = 'validated', 
  validation_status = 'validated',
  processing_status = 'validated',
  
  -- Account type
  account_type = 'resident',
  
  -- Update timestamps
  updated_at = NOW()

WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND customer_id = 'c91b1234-5678-9012-3456-789012345678';

-- Update MuniNow Licensing bills with fee profile data
UPDATE master_bills 
SET 
  finix_merchant_id = 'MUnVXggc2zZow3v1nZGJ63gY',
  finix_merchant_profile_id = 'MPpCsPRkGa1zGrjBLjgeufZ',
  merchant_fee_profile_id = '3aa98f29-78f8-4ad6-ae1e-8effcce5ae05',
  basis_points = 290,
  fixed_fee = 30,
  ach_basis_points = 20,
  ach_fixed_fee = 30,
  calculated_fee_cents = GREATEST(30, (amount_due_cents * 290 / 10000)),
  statement_descriptor = 'Muni Licensing'
WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND merchant_id = '4ffd550f-edcd-4f48-8565-f8401c197209';

-- Update MuniNow Ticketing bills with fee profile data  
UPDATE master_bills 
SET 
  finix_merchant_id = 'MUkxGHFJJ2YpqfAHxvNPewjv',
  finix_merchant_profile_id = 'MPpAgf3UE3zoCD2JwfCNcEEH',
  -- No fee profile exists yet, set defaults
  basis_points = 275,
  fixed_fee = 25,
  ach_basis_points = 25,
  ach_fixed_fee = 25,
  calculated_fee_cents = GREATEST(25, (amount_due_cents * 275 / 10000)),
  statement_descriptor = 'MuniTicket'
WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND merchant_id = 'dfc7782d-6e2a-4201-9c12-35c8925add4b';

-- Update MuniNow Taxes bills with fee profile data
UPDATE master_bills 
SET 
  finix_merchant_id = 'MUc4PkW4jSAy3ZbMCrg3Bhed',
  finix_merchant_profile_id = 'MPq51R5cP566Fjh3PAg26YZD',
  -- No fee profile exists yet, set defaults
  basis_points = 250,
  fixed_fee = 50,
  ach_basis_points = 20,
  ach_fixed_fee = 50,
  calculated_fee_cents = GREATEST(50, (amount_due_cents * 250 / 10000)),
  statement_descriptor = 'MuniTax'
WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND merchant_id = '70111580-dfcb-4b3c-b460-7d798e9a0870';