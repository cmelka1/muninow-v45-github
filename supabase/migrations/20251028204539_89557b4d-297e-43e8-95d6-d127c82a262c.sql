-- Update storage bucket policy for business license documents to support all municipal account types
DROP POLICY IF EXISTS "Municipal users can view documents for their customer" 
ON storage.objects;

CREATE POLICY "Municipal users can view business license documents for their customer"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'business-license-documents' 
  AND EXISTS (
    SELECT 1
    FROM business_license_documents bld
    JOIN business_license_applications bla ON bla.id = bld.license_id
    JOIN profiles p ON p.id = auth.uid()
    WHERE bld.storage_path = objects.name
      AND p.customer_id = bla.customer_id
      AND p.account_type = ANY (ARRAY['municipal'::text, 'municipaladmin'::text, 'municipaluser'::text])
  )
);