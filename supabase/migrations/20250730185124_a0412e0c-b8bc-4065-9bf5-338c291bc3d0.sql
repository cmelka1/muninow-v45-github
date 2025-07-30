-- Create database records for existing permit documents in storage
-- First, let's get the necessary information from related tables to populate the permit_documents table

-- Insert records for the existing permit documents in storage
INSERT INTO permit_documents (
  permit_id,
  user_id,
  customer_id,
  merchant_id,
  merchant_name,
  file_name,
  document_type,
  description,
  storage_path,
  file_size,
  content_type,
  uploaded_at,
  created_at,
  updated_at
)
SELECT 
  -- Extract permit_id from the storage path
  CASE 
    WHEN name LIKE '%/permits/8abcc7ae-166a-4424-a4dd-8e7242507aaa/%' THEN '8abcc7ae-166a-4424-a4dd-8e7242507aaa'::uuid
    WHEN name LIKE '%/permits/f50e20ff-b947-41d7-a32e-83fc7ea8b3fd/%' THEN 'f50e20ff-b947-41d7-a32e-83fc7ea8b3fd'::uuid
    WHEN name LIKE '%/permits/25475592-4bae-4428-9c4a-5bbf2b6a73fb/%' THEN '25475592-4bae-4428-9c4a-5bbf2b6a73fb'::uuid
  END as permit_id,
  -- We'll need to get user_id from permit_applications table
  pa.user_id,
  pa.customer_id,
  pa.merchant_id,
  pa.merchant_name,
  -- Extract filename from the storage path
  CASE 
    WHEN name LIKE '%1753826768659-MuniNow Banner No Logo.png' THEN 'MuniNow Banner No Logo.png'
    WHEN name LIKE '%1753824662661-MuniNow Banner No Logo.png' THEN 'MuniNow Banner No Logo.png'
    WHEN name LIKE '%1753823691655-MuniNow Banner.png' THEN 'MuniNow Banner.png'
  END as file_name,
  'uploaded_document' as document_type,
  'Document uploaded via permit application' as description,
  so.name as storage_path,
  COALESCE(so.metadata->>'size', '0')::integer as file_size,
  COALESCE(so.metadata->>'mimetype', 'application/octet-stream') as content_type,
  so.created_at as uploaded_at,
  so.created_at as created_at,
  so.created_at as updated_at
FROM storage.objects so
LEFT JOIN permit_applications pa ON (
  (so.name LIKE '%/permits/8abcc7ae-166a-4424-a4dd-8e7242507aaa/%' AND pa.permit_id = '8abcc7ae-166a-4424-a4dd-8e7242507aaa'::uuid) OR
  (so.name LIKE '%/permits/f50e20ff-b947-41d7-a32e-83fc7ea8b3fd/%' AND pa.permit_id = 'f50e20ff-b947-41d7-a32e-83fc7ea8b3fd'::uuid) OR
  (so.name LIKE '%/permits/25475592-4bae-4428-9c4a-5bbf2b6a73fb/%' AND pa.permit_id = '25475592-4bae-4428-9c4a-5bbf2b6a73fb'::uuid)
)
WHERE so.bucket_id = 'permit-documents' 
  AND so.name LIKE '%/permits/%'
  AND so.name NOT LIKE '%/temp/%'
  AND pa.permit_id IS NOT NULL;