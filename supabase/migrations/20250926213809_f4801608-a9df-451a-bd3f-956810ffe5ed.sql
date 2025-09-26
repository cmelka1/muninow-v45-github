-- Enable RLS and add SELECT policies for municipal access to tax submissions and documents
-- IMPORTANT: Uses existing helper functions has_municipal_access_to_customer() and is_current_user_super_admin()

-- 1) tax_submissions
ALTER TABLE public.tax_submissions ENABLE ROW LEVEL SECURITY;

-- Allow end-users to view their own submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tax_submissions' 
      AND policyname = 'Users can view their own tax submissions'
  ) THEN
    CREATE POLICY "Users can view their own tax submissions"
    ON public.tax_submissions
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END$$;

-- Allow municipal users to view submissions for their customer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tax_submissions' 
      AND policyname = 'Municipal users can view tax submissions for their customer'
  ) THEN
    CREATE POLICY "Municipal users can view tax submissions for their customer"
    ON public.tax_submissions
    FOR SELECT
    USING (has_municipal_access_to_customer(auth.uid(), customer_id));
  END IF;
END$$;

-- Allow super admins to view all submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tax_submissions' 
      AND policyname = 'Super admins can view all tax submissions'
  ) THEN
    CREATE POLICY "Super admins can view all tax submissions"
    ON public.tax_submissions
    FOR SELECT
    USING (is_current_user_super_admin());
  END IF;
END$$;


-- 2) tax_submission_documents
ALTER TABLE public.tax_submission_documents ENABLE ROW LEVEL SECURITY;

-- Allow end-users to view their uploaded documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tax_submission_documents' 
      AND policyname = 'Users can view their own tax documents'
  ) THEN
    CREATE POLICY "Users can view their own tax documents"
    ON public.tax_submission_documents
    FOR SELECT
    USING (uploaded_by = auth.uid());
  END IF;
END$$;

-- Allow municipal users to view documents tied to submissions in their customer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tax_submission_documents' 
      AND policyname = 'Municipal users can view tax documents for their customer submissions'
  ) THEN
    CREATE POLICY "Municipal users can view tax documents for their customer submissions"
    ON public.tax_submission_documents
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.tax_submissions ts
        WHERE ts.id = tax_submission_documents.tax_submission_id
          AND has_municipal_access_to_customer(auth.uid(), ts.customer_id)
      )
    );
  END IF;
END$$;

-- Optional: super admins can view all documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tax_submission_documents' 
      AND policyname = 'Super admins can view all tax documents'
  ) THEN
    CREATE POLICY "Super admins can view all tax documents"
    ON public.tax_submission_documents
    FOR SELECT
    USING (is_current_user_super_admin());
  END IF;
END$$;