-- Drop the old conflicting SELECT policy that doesn't handle staged documents
DROP POLICY IF EXISTS "Users can view documents for their own tax submissions" ON public.tax_submission_documents;