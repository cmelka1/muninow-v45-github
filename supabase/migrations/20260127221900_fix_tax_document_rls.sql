-- Fix RLS policies for tax_submission_documents to support staged document uploads
-- The issue: INSERT policy references user_id but table has uploaded_by column
-- Also: Original policy required valid tax_submission_id, but staging uploads have null tax_submission_id

-- Drop existing policies that are causing issues
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can insert documents for their own tax submissions" ON public.tax_submission_documents;
  DROP POLICY IF EXISTS "Users can view their own tax submission documents" ON public.tax_submission_documents;
  DROP POLICY IF EXISTS "Users can update their own tax submission documents" ON public.tax_submission_documents;
  DROP POLICY IF EXISTS "Users can delete their own tax submission documents" ON public.tax_submission_documents;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create corrected INSERT policy: Allow users to insert their own documents
-- Uses uploaded_by column (which is what the table actually has)
-- Does NOT require tax_submission_id since staging uploads have null
CREATE POLICY "Users can insert their own tax submission documents" 
ON public.tax_submission_documents 
FOR INSERT 
WITH CHECK (uploaded_by = auth.uid());

-- Create corrected SELECT policy: Users can view documents they uploaded OR that belong to their submissions
CREATE POLICY "Users can view their own tax submission documents" 
ON public.tax_submission_documents 
FOR SELECT 
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tax_submissions ts
    WHERE ts.id = tax_submission_documents.tax_submission_id
    AND ts.user_id = auth.uid()
  )
);

-- Create UPDATE policy: Users can update documents they uploaded
CREATE POLICY "Users can update their own tax submission documents" 
ON public.tax_submission_documents 
FOR UPDATE 
USING (uploaded_by = auth.uid());

-- Create DELETE policy: Users can delete documents they uploaded
CREATE POLICY "Users can delete their own tax submission documents" 
ON public.tax_submission_documents 
FOR DELETE 
USING (uploaded_by = auth.uid());

-- Service role policy: Allow Edge functions to update documents (for linking staged docs)
-- This is needed because confirm_staged_tax_documents runs as SECURITY DEFINER
-- No action needed - SECURITY DEFINER functions bypass RLS
