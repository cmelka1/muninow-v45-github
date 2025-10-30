-- Update created_at to match the backdated 2024 timeline for license OAK-2024-000002
UPDATE business_license_applications
SET 
  created_at = '2024-10-30 16:15:48.29074+00',
  updated_at = NOW()
WHERE id = 'e59351de-6c98-426e-be35-eec8485661ff'
  AND license_number = 'OAK-2024-000002';