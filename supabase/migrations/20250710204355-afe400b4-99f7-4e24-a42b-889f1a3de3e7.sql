-- Migration: Assign customer_id and merchant_id to existing municipal bills (Fixed)
-- Phase 1: Create Springfield Municipality customer record

INSERT INTO customers (
  customer_id,
  user_id,
  legal_entity_name,
  doing_business_as,
  entity_type,
  entity_description,
  entity_phone,
  tax_id,
  mcc_code,
  ownership_type,
  first_name,
  last_name,
  job_title,
  work_email,
  personal_address_line1,
  personal_city,
  personal_state,
  personal_zip_code,
  personal_phone,
  business_address_line1,
  business_city,
  business_state,
  business_zip_code
) VALUES (
  'ffa9d6bc-9cd8-4199-9a86-4185f5604242', -- Springfield municipality_id
  (SELECT id FROM profiles WHERE email = 'cmelka@muninow.com' LIMIT 1),
  'City of Springfield',
  'Springfield Municipality',
  'GOVERNMENT_ENTITY',
  'Municipal government entity for Springfield, Illinois',
  '217-789-2000',
  '36-1234567',
  '9399', -- MCC for Government Services
  'PUBLIC',
  'Municipal',
  'Administrator',
  'Administrator',
  'admin@springfield.gov',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  '217-789-2000',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701'
) ON CONFLICT (customer_id) DO NOTHING;

-- Phase 2: Create merchant records for major service categories

INSERT INTO merchants (
  user_id,
  merchant_name,
  business_name,
  doing_business_as,
  business_type,
  business_description,
  business_phone,
  business_website,
  business_tax_id,
  business_address_line1,
  business_address_city,
  business_address_state,
  business_address_zip_code,
  business_address_country,
  mcc_code,
  category,
  subcategory,
  statement_descriptor,
  refund_policy,
  ownership_type,
  owner_first_name,
  owner_last_name,
  owner_job_title,
  owner_work_email,
  owner_personal_address_line1,
  owner_personal_address_city,
  owner_personal_address_state,
  owner_personal_address_zip_code,
  owner_personal_address_country,
  owner_personal_phone,
  customer_first_name,
  customer_last_name,
  customer_email,
  customer_phone,
  customer_street_address,
  customer_city,
  customer_state,
  customer_zip_code,
  customer_country,
  merchant_agreement_accepted,
  merchant_agreement_timestamp,
  merchant_agreement_ip_address,
  merchant_agreement_user_agent,
  data_source_system
) VALUES 
-- Municipal Tax Services Merchant
(
  (SELECT id FROM profiles WHERE email = 'cmelka@muninow.com' LIMIT 1),
  'Springfield Tax Services',
  'Springfield Tax Department',
  'Springfield Tax Services',
  'PARTNERSHIP',
  'Municipal tax collection and assessment services',
  '217-789-2100',
  'https://springfield.gov/tax',
  '36-1234568',
  '300 S 7th St, Suite 100',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '9399',
  'Government Services',
  'Tax Collection',
  'SPFLD TAX SVCS',
  'NO_REFUNDS',
  'PUBLIC',
  'Tax',
  'Administrator',
  'Director',
  'tax@springfield.gov',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '217-789-2100',
  'Municipal',
  'Administrator',
  'admin@springfield.gov',
  '217-789-2000',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  true,
  now(),
  '127.0.0.1',
  'Migration Script',
  'municipal_bills_migration'
),
-- Municipal Court Services Merchant  
(
  (SELECT id FROM profiles WHERE email = 'cmelka@muninow.com' LIMIT 1),
  'Springfield Court Services',
  'Springfield Municipal Court',
  'Springfield Court Services',
  'PARTNERSHIP',
  'Municipal court fines and fees collection',
  '217-789-2200',
  'https://springfield.gov/court',
  '36-1234569',
  '300 S 7th St, Suite 200',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '9399',
  'Government Services',
  'Court Services',
  'SPFLD COURT',
  'NO_REFUNDS',
  'PUBLIC',
  'Court',
  'Administrator',
  'Clerk',
  'court@springfield.gov',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '217-789-2200',
  'Municipal',
  'Administrator',
  'admin@springfield.gov',
  '217-789-2000',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  true,
  now(),
  '127.0.0.1',
  'Migration Script',
  'municipal_bills_migration'
),
-- Municipal Licensing Services Merchant
(
  (SELECT id FROM profiles WHERE email = 'cmelka@muninow.com' LIMIT 1),
  'Springfield Licensing Services',
  'Springfield Licensing Department',
  'Springfield Licensing Services',
  'PARTNERSHIP',
  'Municipal permits and licensing services',
  '217-789-2300',
  'https://springfield.gov/licensing',
  '36-1234570',
  '300 S 7th St, Suite 300',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '9399',
  'Government Services',
  'Licensing',
  'SPFLD LICENSE',
  'NO_REFUNDS',
  'PUBLIC',
  'Licensing',
  'Administrator',
  'Director',
  'licensing@springfield.gov',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '217-789-2300',
  'Municipal',
  'Administrator',
  'admin@springfield.gov',
  '217-789-2000',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  true,
  now(),
  '127.0.0.1',
  'Migration Script',
  'municipal_bills_migration'
),
-- Municipal Utilities Services Merchant
(
  (SELECT id FROM profiles WHERE email = 'cmelka@muninow.com' LIMIT 1),
  'Springfield Utilities',
  'Springfield Municipal Utilities',
  'Springfield Utilities',
  'PARTNERSHIP',
  'Municipal utilities and public works services',
  '217-789-2400',
  'https://springfield.gov/utilities',
  '36-1234571',
  '300 S 7th St, Suite 400',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '9399',
  'Government Services',
  'Utilities',
  'SPFLD UTILS',
  'NO_REFUNDS',
  'PUBLIC',
  'Utilities',
  'Administrator',
  'Director',
  'utilities@springfield.gov',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  '217-789-2400',
  'Municipal',
  'Administrator',
  'admin@springfield.gov',
  '217-789-2000',
  '300 S 7th St',
  'Springfield',
  'IL',
  '62701',
  'USA',
  true,
  now(),
  '127.0.0.1',
  'Migration Script',
  'municipal_bills_migration'
);

-- Phase 3: Update existing municipal bills with customer_id and merchant_id assignments

-- Update bills with customer_id (Springfield Municipality)
UPDATE municipal_bills 
SET customer_id = 'ffa9d6bc-9cd8-4199-9a86-4185f5604242'::text
WHERE municipality_id = 'ffa9d6bc-9cd8-4199-9a86-4185f5604242'
   OR municipality_id IS NULL;

-- Update bills with merchant_id based on vendor/category mapping
-- Tax-related vendors
UPDATE municipal_bills 
SET merchant_id = (
  SELECT id FROM merchants 
  WHERE merchant_name = 'Springfield Tax Services' 
    AND data_source_system = 'municipal_bills_migration'
  LIMIT 1
)::text
WHERE vendor IN (
  'Tax Department', 'Cook County Treasurer', 'Illinois Department of Revenue',
  'Property Tax', 'Sales Tax', 'Income Tax', 'Business Tax'
) OR category IN ('Tax', 'Property Tax', 'Sales Tax');

-- Court/Legal vendors  
UPDATE municipal_bills 
SET merchant_id = (
  SELECT id FROM merchants 
  WHERE merchant_name = 'Springfield Court Services'
    AND data_source_system = 'municipal_bills_migration'
  LIMIT 1
)::text
WHERE vendor IN (
  'Chicago Circuit Court', 'Municipal Court Fees', 'Traffic Court',
  'Court Administration', 'Legal Services', 'Citation Processing'
) OR category IN ('Court Fees', 'Fines', 'Citations', 'Legal');

-- Licensing vendors
UPDATE municipal_bills 
SET merchant_id = (
  SELECT id FROM merchants 
  WHERE merchant_name = 'Springfield Licensing Services'
    AND data_source_system = 'municipal_bills_migration'
  LIMIT 1
)::text
WHERE vendor IN (
  'Building Permits', 'Business License', 'Zoning Department',
  'Planning Department', 'Code Enforcement', 'Permit Office'
) OR category IN ('Permits', 'Licenses', 'Building', 'Zoning');

-- Utilities vendors (and remaining unassigned)
UPDATE municipal_bills 
SET merchant_id = (
  SELECT id FROM merchants 
  WHERE merchant_name = 'Springfield Utilities'
    AND data_source_system = 'municipal_bills_migration'
  LIMIT 1
)::text
WHERE merchant_id IS NULL
   OR vendor IN (
     'Water Department', 'Electric Department', 'Public Works',
     'Sanitation', 'Waste Management', 'Street Department'
   ) 
   OR category IN ('Water', 'Electric', 'Utilities', 'Public Works');

-- Phase 4: Validation and reporting
DO $$
DECLARE
  total_bills INTEGER;
  assigned_bills INTEGER;
  unassigned_bills INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_bills FROM municipal_bills;
  SELECT COUNT(*) INTO assigned_bills FROM municipal_bills WHERE customer_id IS NOT NULL AND merchant_id IS NOT NULL;
  SELECT COUNT(*) INTO unassigned_bills FROM municipal_bills WHERE customer_id IS NULL OR merchant_id IS NULL;
  
  RAISE NOTICE 'Assignment Summary:';
  RAISE NOTICE 'Total Bills: %', total_bills;
  RAISE NOTICE 'Assigned Bills: %', assigned_bills;
  RAISE NOTICE 'Unassigned Bills: %', unassigned_bills;
  
  IF unassigned_bills > 0 THEN
    RAISE NOTICE 'Warning: % bills still need customer_id or merchant_id assignment', unassigned_bills;
  ELSE
    RAISE NOTICE 'Success: All bills have been assigned customer_id and merchant_id';
  END IF;
END $$;