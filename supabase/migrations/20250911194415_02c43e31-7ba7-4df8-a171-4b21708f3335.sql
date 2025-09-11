-- Fix Sean Smith's account data
-- Update profile account_type from residentadmin to businessadmin
UPDATE profiles 
SET account_type = 'businessadmin' 
WHERE email = 'ssmith94@gmail.com';

-- Remove incorrect resident roles for Sean
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'ssmith94@gmail.com')
AND role_id IN (
  SELECT id FROM roles WHERE name IN ('residentuser', 'residentadmin')
);

-- Add correct business roles for Sean
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.email = 'ssmith94@gmail.com'
AND r.name IN ('businessadmin', 'businessuser')
ON CONFLICT (user_id, role_id) DO NOTHING;