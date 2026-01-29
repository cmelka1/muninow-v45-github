-- =============================================================================
-- COMPLETE MUNICIPAL RLS FIX
-- Fixes two issues found in the 20260125221000_complete_rls_reset.sql:
-- 1. Tax tables missing municipal policies entirely
-- 2. Other tables use exact match 'municipaladmin' instead of LIKE 'municipal%'
-- Applied: 2026-01-29
-- =============================================================================

-- =============================================================================
-- TAX_SUBMISSIONS - Add MISSING municipal access policies
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_submissions') THEN
    DROP POLICY IF EXISTS "Municipal users can view tax submissions for their customer" ON public.tax_submissions;
    DROP POLICY IF EXISTS "Municipal users can update tax submissions for their customer" ON public.tax_submissions;
    
    CREATE POLICY "Municipal users can view tax submissions for their customer" ON public.tax_submissions
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type LIKE 'municipal%' 
        AND profiles.customer_id = tax_submissions.customer_id
      )
    );
    
    CREATE POLICY "Municipal users can update tax submissions for their customer" ON public.tax_submissions
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type LIKE 'municipal%' 
        AND profiles.customer_id = tax_submissions.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- TAX_SUBMISSION_DOCUMENTS - Uses JOIN to tax_submissions (no direct customer_id)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_submission_documents') THEN
    DROP POLICY IF EXISTS "Municipal users can view documents for their customer tax submissions" ON public.tax_submission_documents;
    DROP POLICY IF EXISTS "Municipal users can view tax submission documents" ON public.tax_submission_documents;
    
    CREATE POLICY "Municipal users can view tax submission documents" ON public.tax_submission_documents
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.tax_submissions ts
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ts.id = tax_submission_documents.tax_submission_id
        AND p.account_type LIKE 'municipal%'
        AND p.customer_id = ts.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- TAX_DOCUMENTS - Join through tax_submissions
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_documents') THEN
    DROP POLICY IF EXISTS "Municipal users can view tax documents for their customer" ON public.tax_documents;
    
    CREATE POLICY "Municipal users can view tax documents for their customer" ON public.tax_documents
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.tax_submissions ts
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ts.id = tax_documents.tax_submission_id
        AND p.account_type LIKE 'municipal%'
        AND p.customer_id = ts.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- TAX_CALCULATIONS - Uses JOIN pattern
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_calculations') THEN
    DROP POLICY IF EXISTS "Municipal users can view tax calculations for their customer" ON public.tax_calculations;
    
    CREATE POLICY "Municipal users can view tax calculations for their customer" ON public.tax_calculations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.tax_submissions ts
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ts.id = tax_calculations.tax_submission_id 
        AND p.account_type LIKE 'municipal%' 
        AND p.customer_id = ts.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- SERVICE_APPLICATION_DOCUMENTS - Has customer_id directly
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_application_documents') THEN
    DROP POLICY IF EXISTS "Municipal users can view documents for their customer" ON public.service_application_documents;
    DROP POLICY IF EXISTS "Municipal users can view service documents" ON public.service_application_documents;
    
    CREATE POLICY "Municipal users can view service documents" ON public.service_application_documents
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type LIKE 'municipal%' 
        AND profiles.customer_id = service_application_documents.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- FIX EXISTING POLICIES: Replace 'municipaladmin' exact match with LIKE pattern
-- This ensures municipal_admin, municipal_user, etc. all work correctly
-- =============================================================================

-- MERCHANTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchants') THEN
    DROP POLICY IF EXISTS "Municipal admins view customer merchants" ON public.merchants;
    
    CREATE POLICY "Municipal admins view customer merchants" ON public.merchants
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.account_type LIKE 'municipal%' 
      AND p.customer_id = merchants.customer_id
    ));
  END IF;
END $$;

-- BUSINESS_LICENSE_APPLICATIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_applications') THEN
    DROP POLICY IF EXISTS "Municipal admins manage customer applications" ON public.business_license_applications;
    
    CREATE POLICY "Municipal admins manage customer applications" ON public.business_license_applications
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.account_type LIKE 'municipal%' 
      AND p.customer_id = business_license_applications.customer_id
    ));
  END IF;
END $$;

-- BUSINESS_LICENSE_TYPES_V2
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_types_v2') THEN
    DROP POLICY IF EXISTS "Municipal admins manage customer license types" ON public.business_license_types_v2;
    
    CREATE POLICY "Municipal admins manage customer license types" ON public.business_license_types_v2
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.account_type LIKE 'municipal%' 
      AND p.customer_id = business_license_types_v2.customer_id
    ));
  END IF;
END $$;

-- BUSINESS_LICENSE_DOCUMENTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_documents') THEN
    DROP POLICY IF EXISTS "Municipal admins view customer license documents" ON public.business_license_documents;
    
    CREATE POLICY "Municipal admins view customer license documents" ON public.business_license_documents
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.account_type LIKE 'municipal%' 
      AND p.customer_id = business_license_documents.customer_id
    ));
  END IF;
END $$;

-- BUSINESS_LICENSE_COMMENTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_comments') THEN
    DROP POLICY IF EXISTS "Municipal admins manage license comments" ON public.business_license_comments;
    
    CREATE POLICY "Municipal admins manage license comments" ON public.business_license_comments
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type LIKE 'municipal%'));
  END IF;
END $$;

-- SERVICE_APPLICATIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_applications') THEN
    DROP POLICY IF EXISTS "Municipal admins manage service applications" ON public.service_applications;
    
    CREATE POLICY "Municipal admins manage service applications" ON public.service_applications
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.account_type LIKE 'municipal%' 
      AND p.customer_id = service_applications.customer_id
    ));
  END IF;
END $$;

-- PERMIT_APPLICATIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_applications') THEN
    DROP POLICY IF EXISTS "Municipal admins manage customer permits" ON public.permit_applications;
    
    CREATE POLICY "Municipal admins manage customer permits" ON public.permit_applications
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.account_type LIKE 'municipal%' 
      AND p.customer_id = permit_applications.customer_id
    ));
  END IF;
END $$;

-- PERMIT_TYPES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_types') THEN
    DROP POLICY IF EXISTS "Municipal admins manage permit types" ON public.permit_types;
    
    CREATE POLICY "Municipal admins manage permit types" ON public.permit_types
    FOR ALL USING (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.account_type LIKE 'municipal%' 
      AND p.customer_id = permit_types.customer_id
    ));
  END IF;
END $$;

-- FINIX_DISPUTES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finix_disputes') THEN
    DROP POLICY IF EXISTS "Municipal admins view disputes" ON public.finix_disputes;
    
    CREATE POLICY "Municipal admins view disputes" ON public.finix_disputes
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type LIKE 'municipal%'));
  END IF;
END $$;

-- FRAUD_ATTEMPTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fraud_attempts') THEN
    DROP POLICY IF EXISTS "Admins can view fraud attempts" ON public.fraud_attempts;
    
    CREATE POLICY "Admins can view fraud attempts" ON public.fraud_attempts 
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (account_type = 'superadmin' OR account_type LIKE 'municipal%')
    ));
  END IF;
END $$;

-- FRAUD_SESSIONS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fraud_sessions') THEN
    DROP POLICY IF EXISTS "Admins can view fraud sessions" ON public.fraud_sessions;
    
    CREATE POLICY "Admins can view fraud sessions" ON public.fraud_sessions 
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (account_type = 'superadmin' OR account_type LIKE 'municipal%')
    ));
  END IF;
END $$;

-- =============================================================================
-- PERMIT_INSPECTIONS - Fixed: uses permit_applications.permit_id column
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_inspections') THEN
    DROP POLICY IF EXISTS "Municipal users can manage inspections for their customer permits" ON public.permit_inspections;
    DROP POLICY IF EXISTS "Municipal users can view permit inspections" ON public.permit_inspections;
    DROP POLICY IF EXISTS "Municipal users can manage permit inspections" ON public.permit_inspections;
    
    CREATE POLICY "Municipal users can view permit inspections" ON public.permit_inspections
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.permit_applications pa
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE pa.permit_id = permit_inspections.permit_id
        AND p.account_type LIKE 'municipal%'
        AND p.customer_id = pa.customer_id
      )
    );
    
    CREATE POLICY "Municipal users can manage permit inspections" ON public.permit_inspections
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.permit_applications pa
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE pa.permit_id = permit_inspections.permit_id
        AND p.account_type LIKE 'municipal%'
        AND p.customer_id = pa.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- PERMIT_DOCUMENTS - Uses permit_applications.permit_id
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_documents') THEN
    DROP POLICY IF EXISTS "Municipal users can view permit documents" ON public.permit_documents;
    
    CREATE POLICY "Municipal users can view permit documents" ON public.permit_documents
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.permit_applications pa
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE pa.permit_id = permit_documents.permit_id
        AND p.account_type LIKE 'municipal%'
        AND p.customer_id = pa.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- MUNICIPAL_SERVICE_APPLICATIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_service_applications') THEN
    DROP POLICY IF EXISTS "Municipal users can manage service applications" ON public.municipal_service_applications;
    
    CREATE POLICY "Municipal users can manage service applications" ON public.municipal_service_applications
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type LIKE 'municipal%' 
        AND profiles.customer_id = municipal_service_applications.customer_id
      )
    );
  END IF;
END $$;

-- =============================================================================
-- MUNICIPAL_NEWS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_news') THEN
    DROP POLICY IF EXISTS "Municipal users can manage news" ON public.municipal_news;
    
    CREATE POLICY "Municipal users can manage news" ON public.municipal_news
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type LIKE 'municipal%' 
        AND profiles.customer_id = municipal_news.customer_id
      )
    );
  END IF;
END $$;
