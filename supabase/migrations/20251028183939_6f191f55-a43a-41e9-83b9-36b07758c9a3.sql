-- Update Application #2025-000006 to be within renewable timeline
-- Setting issued_at to October 30, 2024 and expires_at to November 26, 2025
-- This places the application 29 days before expiration (within the 30-day renewal window)

UPDATE municipal_service_applications
SET 
  issued_at = '2024-10-30 18:36:38.828891+00',
  expires_at = '2025-11-26 18:36:38.828891+00',
  updated_at = NOW()
WHERE id = '21dcfc18-c04e-454e-b699-8289262830e3';