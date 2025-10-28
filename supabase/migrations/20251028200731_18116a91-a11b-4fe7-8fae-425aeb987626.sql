-- Allow users to upload documents for their business license applications
CREATE POLICY "Users can upload business license documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'business-license-documents'
  AND (storage.foldername(name))[1] = 'business-licenses'
  AND EXISTS (
    SELECT 1
    FROM business_license_applications bla
    WHERE bla.id::text = (storage.foldername(name))[2]
      AND bla.user_id = auth.uid()
  )
);

-- Allow users to update documents for their business license applications
CREATE POLICY "Users can update business license documents"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'business-license-documents'
  AND (storage.foldername(name))[1] = 'business-licenses'
  AND EXISTS (
    SELECT 1
    FROM business_license_documents bld
    JOIN business_license_applications bla ON bla.id = bld.license_id
    WHERE bld.storage_path = objects.name
      AND bla.user_id = auth.uid()
  )
);

-- Allow users to delete documents for their business license applications
CREATE POLICY "Users can delete business license documents"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'business-license-documents'
  AND (storage.foldername(name))[1] = 'business-licenses'
  AND EXISTS (
    SELECT 1
    FROM business_license_documents bld
    JOIN business_license_applications bla ON bla.id = bld.license_id
    WHERE bld.storage_path = objects.name
      AND bla.user_id = auth.uid()
  )
);

-- Allow municipal users to upload documents for applications in their jurisdiction
CREATE POLICY "Municipal users can upload business license documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'business-license-documents'
  AND (storage.foldername(name))[1] = 'business-licenses'
  AND EXISTS (
    SELECT 1
    FROM business_license_applications bla
    JOIN profiles p ON p.id = auth.uid()
    WHERE bla.id::text = (storage.foldername(name))[2]
      AND bla.customer_id = p.customer_id
      AND p.account_type IN ('municipaladmin', 'municipaluser')
  )
);