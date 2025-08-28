-- Tax Document System Cleanup - Drop Legacy Table and Consolidate RLS Policies (Corrected)

-- First, check if tax_documents table exists and drop it with all its policies
DROP TABLE IF EXISTS public.tax_documents CASCADE;

-- Now clean up and consolidate RLS policies on tax_submission_documents
-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert documents for their own tax submissions" ON public.tax_submission_documents;
DROP POLICY IF EXISTS "Users can view their own tax submission documents" ON public.tax_submission_documents;
DROP POLICY IF EXISTS "Municipal users can view documents for their customer tax submissions" ON public.tax_submission_documents;

-- Create clean, comprehensive RLS policies using correct column name 'uploaded_by'
CREATE POLICY "Users can insert documents for their own tax submissions" 
ON public.tax_submission_documents 
FOR INSERT 
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can view their own tax submission documents" 
ON public.tax_submission_documents 
FOR SELECT 
USING (uploaded_by = auth.uid());

CREATE POLICY "Municipal users can view documents for their customer tax submissions" 
ON public.tax_submission_documents 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tax_submissions ts
  JOIN profiles p ON p.id = auth.uid()
  WHERE ts.id = tax_submission_documents.tax_submission_id
  AND p.account_type = 'municipal' 
  AND p.customer_id = ts.customer_id
));

-- Ensure storage bucket exists for tax documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tax-documents', 'tax-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Tax documents are accessible by document owners" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own tax documents" ON storage.objects;  
DROP POLICY IF EXISTS "Users can delete their own tax documents" ON storage.objects;

-- Create proper storage RLS policies
CREATE POLICY "Tax documents are accessible by document owners" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own tax documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own tax documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);