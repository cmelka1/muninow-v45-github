-- Update tax-documents storage bucket file size limit to 50MB to match frontend validation
UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB in bytes (50 * 1024 * 1024)
WHERE id = 'tax-documents';