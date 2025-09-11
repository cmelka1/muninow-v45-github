-- Fix storage RLS policies for municipal-service-forms bucket
-- Allow municipaladmin and municipaluser to upload PDFs

-- Drop existing policies that may reference 'municipal' account type
DROP POLICY IF EXISTS "Municipal users can upload PDFs to their customer folder" ON storage.objects;
DROP POLICY IF EXISTS "Municipal users can update PDFs in their customer folder" ON storage.objects;
DROP POLICY IF EXISTS "Municipal users can delete PDFs from their customer folder" ON storage.objects;

-- Create INSERT policy for PDF uploads
CREATE POLICY "Municipal admins and users can upload PDFs to their customer folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'municipal-service-forms'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type IN ('municipaladmin', 'municipaluser')
    AND profiles.customer_id::text = (storage.foldername(name))[1]
  )
);

-- Create UPDATE policy for PDF management
CREATE POLICY "Municipal admins and users can update PDFs in their customer folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'municipal-service-forms'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type IN ('municipaladmin', 'municipaluser')
    AND profiles.customer_id::text = (storage.foldername(name))[1]
  )
);

-- Create DELETE policy for PDF management
CREATE POLICY "Municipal admins and users can delete PDFs from their customer folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'municipal-service-forms'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type IN ('municipaladmin', 'municipaluser')
    AND profiles.customer_id::text = (storage.foldername(name))[1]
  )
);