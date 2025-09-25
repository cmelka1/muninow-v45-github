-- Update RLS policies for tax-instructions storage bucket to support all municipal user types

-- Drop existing policies
DROP POLICY IF EXISTS "Municipal users can upload tax instruction documents" ON storage.objects;
DROP POLICY IF EXISTS "Municipal users can view their tax instruction documents" ON storage.objects;
DROP POLICY IF EXISTS "Municipal users can update their tax instruction documents" ON storage.objects;
DROP POLICY IF EXISTS "Municipal users can delete their tax instruction documents" ON storage.objects;

-- Create updated policies that support all municipal account types
CREATE POLICY "Municipal users can upload tax instruction documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tax-instructions' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type IN ('municipal', 'municipaladmin', 'municipaluser')
  )
);

CREATE POLICY "Municipal users can view their tax instruction documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tax-instructions' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type IN ('municipal', 'municipaladmin', 'municipaluser')
  )
);

CREATE POLICY "Municipal users can update their tax instruction documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'tax-instructions' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type IN ('municipal', 'municipaladmin', 'municipaluser')
  )
);

CREATE POLICY "Municipal users can delete their tax instruction documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tax-instructions' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type IN ('municipal', 'municipaladmin', 'municipaluser')
  )
);