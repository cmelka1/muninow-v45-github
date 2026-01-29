-- Comprehensive Document RLS Policy Fix
-- Adds/updates municipal SELECT policies for all document tables
-- Uses has_municipal_access_to_customer() which supports 'municipal', 'municipaluser', 'municipaladmin'

-- =============================================================================
-- 1. FIX business_license_documents (replace municipaladmin-only with helper function)
-- =============================================================================

DROP POLICY IF EXISTS "Municipal admins view customer license documents" ON public.business_license_documents;
DROP POLICY IF EXISTS "Municipal users can view documents for their customer applicati" ON public.business_license_documents;
DROP POLICY IF EXISTS "Municipal staff view business license documents" ON public.business_license_documents;

CREATE POLICY "Municipal staff view business license documents"
ON public.business_license_documents
FOR SELECT
TO authenticated
USING (
  public.has_municipal_access_to_customer(auth.uid(), customer_id)
);

-- =============================================================================
-- 2. ADD service_application_documents municipal SELECT policy (was missing)
-- =============================================================================

DROP POLICY IF EXISTS "Municipal staff view service application documents" ON public.service_application_documents;

CREATE POLICY "Municipal staff view service application documents"
ON public.service_application_documents
FOR SELECT
TO authenticated
USING (
  public.has_municipal_access_to_customer(auth.uid(), customer_id)
);

-- =============================================================================
-- 3. ADD tax_submission_documents municipal SELECT policy (was missing)
-- =============================================================================

DROP POLICY IF EXISTS "Municipal staff view tax submission documents" ON public.tax_submission_documents;

CREATE POLICY "Municipal staff view tax submission documents"
ON public.tax_submission_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tax_submissions ts
    WHERE ts.id = tax_submission_documents.tax_submission_id
    AND public.has_municipal_access_to_customer(auth.uid(), ts.customer_id)
  )
);
