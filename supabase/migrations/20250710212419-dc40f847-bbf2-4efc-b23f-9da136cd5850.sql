-- Insert 20 test bills for cmelka@gmail.com
INSERT INTO master_bills (
  customer_id,
  user_id,
  merchant_id,
  merchant_name,
  category,
  external_bill_number,
  data_source_system,
  amount_due_cents,
  original_amount_cents,
  remaining_balance_cents,
  total_amount_cents,
  payment_status,
  bill_status,
  issue_date,
  due_date,
  street_address,
  city,
  state,
  zip_code,
  first_name,
  last_name
) VALUES
-- Electric bills
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Springfield Electric Company', 'Electricity', 'ELE-2024-001', 'municipal_system', 12450, 12450, 12450, 12450, 'unpaid', 'unpaid', NOW() - INTERVAL '15 days', NOW() + INTERVAL '10 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Metro Power & Light', 'Electricity', 'ELE-2024-002', 'municipal_system', 8750, 8750, 8750, 8750, 'unpaid', 'unpaid', NOW() - INTERVAL '20 days', NOW() + INTERVAL '5 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Water bills  
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'City Water Department', 'Water', 'WAT-2024-001', 'municipal_system', 4560, 4560, 4560, 4560, 'unpaid', 'unpaid', NOW() - INTERVAL '10 days', NOW() + INTERVAL '15 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Regional Water Authority', 'Water', 'WAT-2024-002', 'municipal_system', 6780, 6780, 6780, 6780, 'unpaid', 'unpaid', NOW() - INTERVAL '25 days', NOW() - INTERVAL '2 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Gas bills
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Natural Gas Services', 'Gas', 'GAS-2024-001', 'municipal_system', 15620, 15620, 15620, 15620, 'unpaid', 'unpaid', NOW() - INTERVAL '12 days', NOW() + INTERVAL '8 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Metro Gas Company', 'Gas', 'GAS-2024-002', 'municipal_system', 9340, 9340, 9340, 9340, 'unpaid', 'unpaid', NOW() - INTERVAL '18 days', NOW() + INTERVAL '12 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Waste Management
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Waste Management Pro', 'Waste Management', 'WAS-2024-001', 'municipal_system', 2890, 2890, 2890, 2890, 'unpaid', 'unpaid', NOW() - INTERVAL '8 days', NOW() + INTERVAL '20 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'City Sanitation', 'Waste Management', 'WAS-2024-002', 'municipal_system', 3450, 3450, 3450, 3450, 'unpaid', 'unpaid', NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Telecommunications
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'TeleComm Business Services', 'Telecommunications', 'TEL-2024-001', 'municipal_system', 7820, 7820, 7820, 7820, 'unpaid', 'unpaid', NOW() - INTERVAL '14 days', NOW() + INTERVAL '6 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Digital Connect Services', 'Telecommunications', 'TEL-2024-002', 'municipal_system', 11250, 11250, 11250, 11250, 'unpaid', 'unpaid', NOW() - INTERVAL '22 days', NOW() + INTERVAL '3 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Sewer bills
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Metro Sewer District', 'Sewer', 'SEW-2024-001', 'municipal_system', 5670, 5670, 5670, 5670, 'unpaid', 'unpaid', NOW() - INTERVAL '16 days', NOW() + INTERVAL '14 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'City Wastewater Management', 'Sewer', 'SEW-2024-002', 'municipal_system', 4320, 4320, 4320, 4320, 'unpaid', 'unpaid', NOW() - INTERVAL '28 days', NOW() - INTERVAL '1 day', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Parking bills
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Municipal Parking Authority', 'Parking', 'PAR-2024-001', 'municipal_system', 7500, 7500, 7500, 7500, 'unpaid', 'unpaid', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Downtown Parking Services', 'Parking', 'PAR-2024-002', 'municipal_system', 5000, 5000, 5000, 5000, 'unpaid', 'unpaid', NOW() - INTERVAL '35 days', NOW() - INTERVAL '10 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Property Tax
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'County Tax Assessor', 'Property Tax', 'TAX-2024-001', 'municipal_system', 125000, 125000, 125000, 125000, 'unpaid', 'unpaid', NOW() - INTERVAL '45 days', NOW() + INTERVAL '30 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Municipal Tax Office', 'Property Tax', 'TAX-2024-002', 'municipal_system', 87500, 87500, 87500, 87500, 'unpaid', 'unpaid', NOW() - INTERVAL '60 days', NOW() + INTERVAL '15 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Cable/Internet
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'CableCorp Communications', 'Telecommunications', 'CAB-2024-001', 'municipal_system', 8990, 8990, 8990, 8990, 'unpaid', 'unpaid', NOW() - INTERVAL '11 days', NOW() + INTERVAL '9 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Fiber Optic Solutions', 'Telecommunications', 'CAB-2024-002', 'municipal_system', 12750, 12750, 12750, 12750, 'unpaid', 'unpaid', NOW() - INTERVAL '17 days', NOW() + INTERVAL '13 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),

-- Additional utility bills
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Solar Energy Solutions', 'Electricity', 'SOL-2024-001', 'municipal_system', 6540, 6540, 6540, 6540, 'unpaid', 'unpaid', NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka'),
(gen_random_uuid(), '24ed7570-d3ff-4015-abed-8dec75318b44', gen_random_uuid(), 'Stormwater Management District', 'Water', 'STO-2024-001', 'municipal_system', 3890, 3890, 3890, 3890, 'unpaid', 'unpaid', NOW() - INTERVAL '13 days', NOW() + INTERVAL '17 days', '123 Main St', 'Springfield', 'IL', '62701', 'Charles', 'Melka');