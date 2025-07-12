-- Create 30 master bills with full data relationships
INSERT INTO master_bills (
  -- Core identifiers
  bill_id,
  customer_id,
  profile_id,
  user_id,
  
  -- External system data
  external_bill_number,
  external_account_number,
  external_customer_name,
  external_customer_address_line1,
  external_customer_city,
  external_customer_state,
  external_customer_zip_code,
  external_business_name,
  data_source_system,
  
  -- Financial data
  amount_due_cents,
  original_amount_cents,
  remaining_balance_cents,
  total_amount_cents,
  late_fee_1_cents,
  late_fee_2_cents,
  late_fee_3_cents,
  total_late_fees_cents,
  
  -- Merchant data (will be auto-populated by triggers)
  merchant_id,
  
  -- Fee profile data
  merchant_fee_profile_id,
  basis_points,
  fixed_fee,
  ach_basis_points,
  ach_fixed_fee,
  
  -- Categories
  category,
  subcategory,
  
  -- Dates
  issue_date,
  due_date,
  past_due_date,
  
  -- Status fields
  bill_status,
  payment_status,
  assignment_status,
  data_quality_status,
  
  -- System fields
  idempotency_id,
  created_by_system,
  processing_status,
  validation_status,
  
  -- Generated computed fields
  ingestion_timestamp,
  created_at,
  updated_at
)
SELECT 
  -- Core identifiers
  gen_random_uuid() as bill_id,
  'f92f7f90-93ac-473e-8753-36cf0ef52df9'::uuid as customer_id,
  '24ed7570-d3ff-4015-abed-8dec75318b44'::uuid as profile_id,
  '24ed7570-d3ff-4015-abed-8dec75318b44'::uuid as user_id,
  
  -- External system data
  'EXT-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0') as external_bill_number,
  'ACC-' || LPAD((RANDOM() * 999999)::int::text, 6, '0') as external_account_number,
  
  -- Random customer names
  CASE (RANDOM() * 10)::int
    WHEN 0 THEN 'John Smith'
    WHEN 1 THEN 'Sarah Johnson'
    WHEN 2 THEN 'Michael Brown'
    WHEN 3 THEN 'Jennifer Davis'
    WHEN 4 THEN 'David Wilson'
    WHEN 5 THEN 'Lisa Anderson'
    WHEN 6 THEN 'Robert Taylor'
    WHEN 7 THEN 'Emily Martinez'
    WHEN 8 THEN 'James Garcia'
    ELSE 'Amanda Rodriguez'
  END as external_customer_name,
  
  -- Random addresses
  CASE (RANDOM() * 8)::int
    WHEN 0 THEN '123 Main Street'
    WHEN 1 THEN '456 Oak Avenue'
    WHEN 2 THEN '789 Pine Road'
    WHEN 3 THEN '321 Elm Drive'
    WHEN 4 THEN '654 Maple Lane'
    WHEN 5 THEN '987 Cedar Court'
    WHEN 6 THEN '147 Birch Way'
    ELSE '258 Spruce Boulevard'
  END as external_customer_address_line1,
  
  CASE (RANDOM() * 6)::int
    WHEN 0 THEN 'Springfield'
    WHEN 1 THEN 'Franklin'
    WHEN 2 THEN 'Georgetown'
    WHEN 3 THEN 'Madison'
    WHEN 4 THEN 'Riverside'
    ELSE 'Oakville'
  END as external_customer_city,
  
  CASE (RANDOM() * 5)::int
    WHEN 0 THEN 'CA'
    WHEN 1 THEN 'TX'
    WHEN 2 THEN 'FL'
    WHEN 3 THEN 'NY'
    ELSE 'IL'
  END as external_customer_state,
  
  LPAD((10000 + RANDOM() * 89999)::int::text, 5, '0') as external_customer_zip_code,
  
  -- Random business names for business bills
  CASE (RANDOM() * 8)::int
    WHEN 0 THEN 'City Water Department'
    WHEN 1 THEN 'Metro Electric Utility'
    WHEN 2 THEN 'Municipal Waste Services'
    WHEN 3 THEN 'Downtown Parking Authority'
    WHEN 4 THEN 'County Tax Office'
    WHEN 5 THEN 'City Planning Department'
    WHEN 6 THEN 'Public Works Division'
    ELSE 'Municipal Court Services'
  END as external_business_name,
  
  'LEGACY_IMPORT' as data_source_system,
  
  -- Financial data - random amounts between $25-$500
  (2500 + RANDOM() * 47500)::bigint as amount_due_cents,
  (2500 + RANDOM() * 47500)::bigint as original_amount_cents,
  CASE 
    WHEN RANDOM() < 0.7 THEN (2500 + RANDOM() * 47500)::bigint  -- 70% unpaid
    ELSE 0  -- 30% paid
  END as remaining_balance_cents,
  
  -- Total amount (will be calculated with late fees)
  (2500 + RANDOM() * 47500 + 
   CASE WHEN RANDOM() < 0.3 THEN (500 + RANDOM() * 1500)::int ELSE 0 END)::bigint as total_amount_cents,
  
  -- Late fees for overdue bills
  CASE WHEN RANDOM() < 0.3 THEN (500 + RANDOM() * 1000)::bigint ELSE 0 END as late_fee_1_cents,
  CASE WHEN RANDOM() < 0.15 THEN (500 + RANDOM() * 1000)::bigint ELSE 0 END as late_fee_2_cents,
  CASE WHEN RANDOM() < 0.05 THEN (500 + RANDOM() * 1000)::bigint ELSE 0 END as late_fee_3_cents,
  
  -- Total late fees (sum of individual late fees)
  COALESCE(
    (CASE WHEN RANDOM() < 0.3 THEN (500 + RANDOM() * 1000)::bigint ELSE 0 END) +
    (CASE WHEN RANDOM() < 0.15 THEN (500 + RANDOM() * 1000)::bigint ELSE 0 END) +
    (CASE WHEN RANDOM() < 0.05 THEN (500 + RANDOM() * 1000)::bigint ELSE 0 END),
    0
  ) as total_late_fees_cents,
  
  -- Merchant assignment (cycling through available merchants)
  merchants_array.merchant_id,
  
  -- Fee profile data from merchant_fee_profiles
  fee_data.fee_profile_id,
  fee_data.basis_points,
  fee_data.fixed_fee,
  fee_data.ach_basis_points,
  fee_data.ach_fixed_fee,
  
  -- Categories
  categories_array.category,
  categories_array.subcategory,
  
  -- Dates
  NOW() - INTERVAL '1 day' * (RANDOM() * 180)::int as issue_date,
  NOW() - INTERVAL '1 day' * (RANDOM() * 180)::int + INTERVAL '30 days' as due_date,
  NOW() - INTERVAL '1 day' * (RANDOM() * 180)::int + INTERVAL '45 days' as past_due_date,
  
  -- Status fields
  CASE (RANDOM() * 3)::int
    WHEN 0 THEN 'unpaid'::bill_status_enum
    WHEN 1 THEN 'overdue'::bill_status_enum
    ELSE 'paid'::bill_status_enum
  END as bill_status,
  
  CASE (RANDOM() * 3)::int
    WHEN 0 THEN 'unpaid'::payment_status_enum
    WHEN 1 THEN 'partial'::payment_status_enum
    ELSE 'paid'::payment_status_enum
  END as payment_status,
  
  'assigned'::assignment_status_enum as assignment_status,
  'validated'::data_quality_status_enum as data_quality_status,
  
  -- System fields
  'IMP-' || encode(gen_random_bytes(16), 'hex') as idempotency_id,
  'BILL_GENERATOR_v1.0' as created_by_system,
  'processed' as processing_status,
  'validated' as validation_status,
  
  -- Timestamps
  NOW() - INTERVAL '1 day' * (RANDOM() * 30)::int as ingestion_timestamp,
  NOW() as created_at,
  NOW() as updated_at

FROM 
  generate_series(1, 30) as bill_number,
  
  -- Get available merchants in a cycling pattern
  LATERAL (
    SELECT 
      merchant_id,
      ROW_NUMBER() OVER() as rn
    FROM (
      SELECT id as merchant_id FROM merchants 
      WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
      ORDER BY created_at
    ) m
  ) merchants_array 
  ON merchants_array.rn = ((bill_number - 1) % (SELECT COUNT(*) FROM merchants WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44')) + 1,
  
  -- Get fee profile data for the selected merchant
  LATERAL (
    SELECT 
      mfp.id as fee_profile_id,
      mfp.basis_points,
      mfp.fixed_fee,
      mfp.ach_basis_points,
      mfp.ach_fixed_fee
    FROM merchant_fee_profiles mfp
    WHERE mfp.merchant_id = merchants_array.merchant_id
    LIMIT 1
  ) fee_data,
  
  -- Get random categories
  LATERAL (
    SELECT 
      category,
      subcategory
    FROM (
      VALUES 
        ('Utilities & Services', 'Water'),
        ('Utilities & Services', 'Sewer'),
        ('Utilities & Services', 'Electric'),
        ('Utilities & Services', 'Trash / Solid Waste / Recycling'),
        ('Property-Related', 'Property Taxes'),
        ('Property-Related', 'Special Assessments'),
        ('Vehicle & Transportation', 'Parking Tickets'),
        ('Vehicle & Transportation', 'Traffic Fines'),
        ('Licensing & Registration', 'Business Licenses'),
        ('Administrative & Civic Fees', 'Public Records Requests (FOIA)'),
        ('Court & Legal', 'Court Fines'),
        ('Community Programs & Education', 'Recreation Program Fees'),
        ('Other Specialized Payments', 'Impact Fees')
    ) as cats(category, subcategory)
    ORDER BY RANDOM()
    LIMIT 1
  ) categories_array;