-- Tax Document System Cleanup - Drop Legacy Table and Consolidate RLS Policies

-- First, check if tax_documents table exists and drop it with all its policies
DROP TABLE IF EXISTS public.tax_documents CASCADE;

-- Now clean up and consolidate RLS policies on tax_submission_documents
-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert documents for their own tax submissions" ON public.tax_submission_documents;
DROP POLICY IF EXISTS "Users can view their own tax submission documents" ON public.tax_submission_documents;
DROP POLICY IF EXISTS "Municipal users can view documents for their customer tax submissions" ON public.tax_submission_documents;

-- Create clean, comprehensive RLS policies
CREATE POLICY "Users can insert documents for their own tax submissions" 
ON public.tax_submission_documents 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own tax submission documents" 
ON public.tax_submission_documents 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Municipal users can view documents for their customer tax submissions" 
ON public.tax_submission_documents 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND account_type = 'municipal' 
  AND customer_id = tax_submission_documents.customer_id
));

-- Ensure storage bucket has proper RLS policies for tax-documents bucket
CREATE POLICY IF NOT EXISTS "Tax documents are accessible by document owners" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can upload their own tax documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete their own tax documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tax-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);