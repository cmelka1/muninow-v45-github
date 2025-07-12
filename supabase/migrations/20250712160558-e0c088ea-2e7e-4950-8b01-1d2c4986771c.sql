-- Randomly fill out ach_basis_points to fixed_fee columns if they are currently empty
UPDATE master_bills 
SET 
  ach_basis_points = CASE 
    WHEN ach_basis_points IS NULL THEN 
      (CASE hashtext(bill_id::text) % 5
        WHEN 0 THEN 20
        WHEN 1 THEN 25  
        WHEN 2 THEN 30
        WHEN 3 THEN 35
        ELSE 40
      END)
    ELSE ach_basis_points
  END,
  ach_fixed_fee = CASE 
    WHEN ach_fixed_fee IS NULL THEN 
      (CASE hashtext(bill_id::text) % 4
        WHEN 0 THEN 25
        WHEN 1 THEN 30
        WHEN 2 THEN 35
        ELSE 40
      END)
    ELSE ach_fixed_fee
  END,
  basis_points = CASE 
    WHEN basis_points IS NULL THEN 
      (CASE hashtext(bill_id::text) % 6
        WHEN 0 THEN 250
        WHEN 1 THEN 275
        WHEN 2 THEN 290
        WHEN 3 THEN 300
        WHEN 4 THEN 325
        ELSE 350
      END)
    ELSE basis_points
  END,
  fixed_fee = CASE 
    WHEN fixed_fee IS NULL THEN 
      (CASE hashtext(bill_id::text) % 3
        WHEN 0 THEN 25
        WHEN 1 THEN 30
        ELSE 35
      END)
    ELSE fixed_fee
  END,
  updated_at = NOW()
WHERE profile_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND created_by_system = 'BILL_GENERATOR_v1.0'
  AND (ach_basis_points IS NULL OR ach_fixed_fee IS NULL OR basis_points IS NULL OR fixed_fee IS NULL);