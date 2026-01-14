-- Storage Bucket Configuration for Offline Inspections

-- 1. Create the new bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-assets', 
  'inspection-assets', 
  false, -- Private bucket
  10485760, -- 10MB limit per file (we compress client-side, but this is a safety net)
  '{image/jpeg,image/png,image/webp}'
)
ON CONFLICT (id) DO UPDATE SET 
  public = false;

-- 2. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage Policies

-- A. Municipal Users Can Upload (INSERT)
-- Only users with 'municipal' account type can upload
CREATE POLICY "Municipal users can upload inspection assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'inspection-assets' AND
  (storage.foldername(name))[1] != 'private' AND
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
  )
);

-- B. Municipal Users Can View (SELECT)
-- They can view any asset in this bucket (simplified access model for now)
-- In production, might restrict to THEIR merchant_id folder
CREATE POLICY "Municipal users can view inspection assets" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'inspection-assets' AND
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
  )
);

-- C. Municipal Users Can Update/Delete (Own Objects)
CREATE POLICY "Users can update/delete their own assets" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'inspection-assets' AND
  owner = auth.uid()
);
