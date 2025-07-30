-- Update the permit document to link to the actual MuniNow Banner file in storage
UPDATE permit_documents 
SET 
  storage_path = '24ed7570-d3ff-4015-abed-8dec75318b44/permits/8abcc7ae-166a-4424-a4dd-8e7242507aaa/1753826768659-MuniNow Banner No Logo.png',
  file_name = 'MuniNow Banner No Logo.png',
  content_type = 'image/png',
  file_size = 809225,
  document_type = 'banner',
  description = 'MuniNow banner image for permit documentation'
WHERE id = '72394750-0907-40f2-8868-12e07b21bf8e';