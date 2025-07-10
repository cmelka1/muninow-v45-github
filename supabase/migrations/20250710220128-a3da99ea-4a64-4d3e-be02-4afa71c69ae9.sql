-- Update Charles Melka's existing bills with external customer information
UPDATE master_bills 
SET 
  external_customer_name = 'Charles Melka',
  external_customer_address_line1 = '8472 Dolfor Cove',
  external_customer_city = 'Burr Ridge',
  external_customer_state = 'IL',
  external_customer_zip_code = '60527',
  external_customer_type = 'resident',
  updated_at = now()
WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44';

-- Create 5 new test bills with different names but same address to test smart matching
INSERT INTO master_bills (
  customer_id,
  data_source_system,
  external_bill_number,
  amount_due_cents,
  original_amount_cents,
  remaining_balance_cents,
  total_amount_cents,
  external_customer_name,
  external_customer_address_line1,
  external_customer_city,
  external_customer_state,
  external_customer_zip_code,
  external_customer_type,
  category,
  subcategory,
  merchant_id,
  bill_status,
  payment_status,
  assignment_status,
  created_at,
  updated_at
) VALUES 
-- Test Bill 1: Robert Smith
(
  'c91b1234-5678-9012-3456-789012345678',
  'test_matching_system',
  'TEST-MATCH-001',
  15000, 15000, 15000, 15000,
  'Robert Smith',
  '8472 Dolfor Cove',
  'Burr Ridge',
  'IL',
  '60527',
  'resident',
  'Parking Tickets',
  'Vehicle & Transportation',
  'dfc7782d-6e2a-4201-9c12-35c8925add4b',
  'unpaid',
  'unpaid',
  'unassigned',
  now(),
  now()
),
-- Test Bill 2: Jennifer Davis
(
  'c91b1234-5678-9012-3456-789012345678',
  'test_matching_system',
  'TEST-MATCH-002',
  12500, 12500, 12500, 12500,
  'Jennifer Davis',
  '8472 Dolfor Cove',
  'Burr Ridge',
  'IL',
  '60527',
  'resident',
  'Property Taxes',
  'Property-Related',
  '70111580-dfcb-4b3c-b460-7d798e9a0870',
  'unpaid',
  'unpaid',
  'unassigned',
  now(),
  now()
),
-- Test Bill 3: Michael Johnson
(
  'c91b1234-5678-9012-3456-789012345678',
  'test_matching_system',
  'TEST-MATCH-003',
  8750, 8750, 8750, 8750,
  'Michael Johnson',
  '8472 Dolfor Cove',
  'Burr Ridge',
  'IL',
  '60527',
  'resident',
  'Business Licenses',
  'Licensing & Registration',
  '4ffd550f-edcd-4f48-8565-f8401c197209',
  'unpaid',
  'unpaid',
  'unassigned',
  now(),
  now()
),
-- Test Bill 4: Sarah Wilson
(
  'c91b1234-5678-9012-3456-789012345678',
  'test_matching_system',
  'TEST-MATCH-004',
  20000, 20000, 20000, 20000,
  'Sarah Wilson',
  '8472 Dolfor Cove',
  'Burr Ridge',
  'IL',
  '60527',
  'resident',
  'Traffic Fines',
  'Vehicle & Transportation',
  'dfc7782d-6e2a-4201-9c12-35c8925add4b',
  'unpaid',
  'unpaid',
  'unassigned',
  now(),
  now()
),
-- Test Bill 5: David Brown
(
  'c91b1234-5678-9012-3456-789012345678',
  'test_matching_system',
  'TEST-MATCH-005',
  17500, 17500, 17500, 17500,
  'David Brown',
  '8472 Dolfor Cove',
  'Burr Ridge',
  'IL',
  '60527',
  'resident',
  'Permit Fees',
  'Licensing & Registration',
  '4ffd550f-edcd-4f48-8565-f8401c197209',
  'unpaid',
  'unpaid',
  'unassigned',
  now(),
  now()
);

-- Trigger smart matching for the new test bills
DO $$
DECLARE
  bill_record RECORD;
BEGIN
  FOR bill_record IN 
    SELECT bill_id 
    FROM master_bills 
    WHERE external_bill_number LIKE 'TEST-MATCH-%'
  LOOP
    PERFORM smart_bill_matching(bill_record.bill_id);
  END LOOP;
END $$;