-- Update the permit document to link to an actual file in storage
UPDATE permit_documents 
SET 
  storage_path = 'permit-documents/Muni Overview Jan 2025.pdf',
  file_name = 'Muni Overview Jan 2025.pdf',
  content_type = 'application/pdf',
  file_size = 1048576, -- Approximate 1MB, will be updated when we get actual size
  document_type = 'overview',
  description = 'Municipal overview document for permit reference'
WHERE id = '72394750-0907-40f2-8868-12e07b21bf8e';