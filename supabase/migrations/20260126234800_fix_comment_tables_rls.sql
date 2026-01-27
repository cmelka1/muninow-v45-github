-- =============================================================================
-- FIX RLS POLICIES FOR ALL COMMENT TABLES
-- =============================================================================
-- The complete_rls_reset.sql migration dropped policies for comment tables
-- but only recreated limited policies for business_license_comments (superadmin
-- and municipal admin only). This migration restores user access policies for
-- all comment tables.
-- =============================================================================

-- =============================================================================
-- BUSINESS LICENSE COMMENTS TABLE
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_comments') THEN
    -- Users can view non-internal comments on their own applications
    DROP POLICY IF EXISTS "Users can view comments for their own license applications" ON public.business_license_comments;
    CREATE POLICY "Users can view comments for their own license applications" 
    ON public.business_license_comments 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.business_license_applications bla
        WHERE bla.id = business_license_comments.license_id 
        AND bla.user_id = auth.uid()
      ) 
      AND is_internal = false
    );

    -- Users can create comments on their own applications
    DROP POLICY IF EXISTS "Users can create comments for their own license applications" ON public.business_license_comments;
    CREATE POLICY "Users can create comments for their own license applications" 
    ON public.business_license_comments 
    FOR INSERT 
    WITH CHECK (
      reviewer_id = auth.uid() AND
      is_internal = false AND
      EXISTS (
        SELECT 1 FROM public.business_license_applications bla
        WHERE bla.id = business_license_comments.license_id 
        AND bla.user_id = auth.uid()
      )
    );

    -- Municipal users can view ALL comments for licenses in their jurisdiction
    DROP POLICY IF EXISTS "Municipal users can view license comments" ON public.business_license_comments;
    CREATE POLICY "Municipal users can view license comments"
    ON public.business_license_comments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.business_license_applications bla
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE bla.id = business_license_comments.license_id
        AND bla.customer_id = p.customer_id
        AND p.account_type IN ('municipaladmin', 'municipaluser')
      )
    );

    -- Municipal users can create comments
    DROP POLICY IF EXISTS "Municipal users can create license comments" ON public.business_license_comments;
    CREATE POLICY "Municipal users can create license comments"
    ON public.business_license_comments
    FOR INSERT
    WITH CHECK (
      reviewer_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.business_license_applications bla
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE bla.id = business_license_comments.license_id
        AND bla.customer_id = p.customer_id
        AND p.account_type IN ('municipaladmin', 'municipaluser')
      )
    );
  END IF;
END $$;

-- =============================================================================
-- PERMIT REVIEW COMMENTS TABLE
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_review_comments') THEN
    -- Users can view non-internal comments on their own permit applications
    DROP POLICY IF EXISTS "Users can view comments for their own permits" ON public.permit_review_comments;
    CREATE POLICY "Users can view comments for their own permits"
    ON public.permit_review_comments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.permit_applications pa
        WHERE pa.permit_id = permit_review_comments.permit_id
        AND pa.user_id = auth.uid()
      )
      AND is_internal = false
    );

    -- Users can create non-internal comments on their own permit applications
    DROP POLICY IF EXISTS "Users can create comments for their own permit applications" ON public.permit_review_comments;
    CREATE POLICY "Users can create comments for their own permit applications"
    ON public.permit_review_comments
    FOR INSERT
    WITH CHECK (
      reviewer_id = auth.uid() 
      AND EXISTS (
        SELECT 1 FROM permit_applications pa
        WHERE pa.permit_id = permit_review_comments.permit_id
        AND pa.user_id = auth.uid()
      )
    );

    -- Municipal users can view ALL comments (including internal) for permits in their jurisdiction
    DROP POLICY IF EXISTS "Municipal users can view comments for their customer permits" ON public.permit_review_comments;
    CREATE POLICY "Municipal users can view comments for their customer permits"
    ON public.permit_review_comments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM permit_applications pa
        JOIN profiles p ON p.id = auth.uid()
        WHERE pa.permit_id = permit_review_comments.permit_id
        AND pa.customer_id = p.customer_id
        AND p.account_type IN ('municipaladmin', 'municipaluser')
      )
    );

    -- Municipal users can create comments for permits in their jurisdiction  
    DROP POLICY IF EXISTS "Municipal users can create comments for their customer permits" ON public.permit_review_comments;
    CREATE POLICY "Municipal users can create comments for their customer permits"
    ON public.permit_review_comments
    FOR INSERT
    WITH CHECK (
      reviewer_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM permit_applications pa
        JOIN profiles p ON p.id = auth.uid()
        WHERE pa.permit_id = permit_review_comments.permit_id
        AND pa.customer_id = p.customer_id
        AND p.account_type IN ('municipaladmin', 'municipaluser')
      )
    );

    -- Super admins can do everything with permit comments
    DROP POLICY IF EXISTS "Super admins can manage permit comments" ON public.permit_review_comments;
    CREATE POLICY "Super admins can manage permit comments"
    ON public.permit_review_comments
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND account_type = 'superadmin'
      )
    );
  END IF;
END $$;

-- =============================================================================
-- TAX SUBMISSION COMMENTS TABLE
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_submission_comments') THEN
    -- Users can view non-internal comments on their own tax submissions
    DROP POLICY IF EXISTS "Users can view comments for their own tax submissions" ON public.tax_submission_comments;
    CREATE POLICY "Users can view comments for their own tax submissions" 
    ON public.tax_submission_comments 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.tax_submissions ts
        WHERE ts.id = tax_submission_comments.submission_id 
        AND ts.user_id = auth.uid()
      ) 
      AND is_internal = false
    );

    -- Users can create comments on their own tax submissions
    DROP POLICY IF EXISTS "Users can create comments for their own tax submissions" ON public.tax_submission_comments;
    CREATE POLICY "Users can create comments for their own tax submissions" 
    ON public.tax_submission_comments 
    FOR INSERT 
    WITH CHECK (
      reviewer_id = auth.uid() AND
      is_internal = false AND
      EXISTS (
        SELECT 1 FROM public.tax_submissions ts
        WHERE ts.id = tax_submission_comments.submission_id 
        AND ts.user_id = auth.uid()
      )
    );

    -- Municipal user policies for tax comments
    DROP POLICY IF EXISTS "Municipal users can view all tax comments" ON public.tax_submission_comments;
    CREATE POLICY "Municipal users can view all tax comments"
    ON public.tax_submission_comments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.tax_submissions ts
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ts.id = tax_submission_comments.submission_id 
        AND p.account_type IN ('municipal', 'municipaladmin', 'municipaluser')
        AND p.customer_id = ts.customer_id
      )
    );

    DROP POLICY IF EXISTS "Municipal users can create tax comments" ON public.tax_submission_comments;
    CREATE POLICY "Municipal users can create tax comments"
    ON public.tax_submission_comments
    FOR INSERT
    WITH CHECK (
      reviewer_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM public.tax_submissions ts
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE ts.id = tax_submission_comments.submission_id 
        AND p.account_type IN ('municipal', 'municipaladmin', 'municipaluser')
        AND p.customer_id = ts.customer_id
      )
    );

    -- Super admins can do everything with tax comments
    DROP POLICY IF EXISTS "Super admins can manage tax comments" ON public.tax_submission_comments;
    CREATE POLICY "Super admins can manage tax comments"
    ON public.tax_submission_comments
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND account_type = 'superadmin'
      )
    );
  END IF;
END $$;

-- =============================================================================
-- SERVICE APPLICATION COMMENTS TABLE
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_service_application_comments') THEN
    -- Users can view non-internal comments on their own service applications
    DROP POLICY IF EXISTS "Users can view comments for their own service applications" ON public.municipal_service_application_comments;
    CREATE POLICY "Users can view comments for their own service applications"
    ON public.municipal_service_application_comments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.municipal_service_applications msa
        WHERE msa.id = municipal_service_application_comments.application_id
        AND msa.user_id = auth.uid()
      )
      AND is_internal = false
    );

    -- Users can create non-internal comments on their own service applications
    DROP POLICY IF EXISTS "Users can create comments for their own service applications" ON public.municipal_service_application_comments;
    CREATE POLICY "Users can create comments for their own service applications"
    ON public.municipal_service_application_comments
    FOR INSERT
    WITH CHECK (
      reviewer_id = auth.uid()
      AND is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.municipal_service_applications msa
        WHERE msa.id = municipal_service_application_comments.application_id
        AND msa.user_id = auth.uid()
      )
    );

    -- Municipal users can view ALL comments for applications in their jurisdiction
    DROP POLICY IF EXISTS "Municipal users can view service application comments" ON public.municipal_service_application_comments;
    CREATE POLICY "Municipal users can view service application comments"
    ON public.municipal_service_application_comments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.municipal_service_applications msa
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE msa.id = municipal_service_application_comments.application_id
        AND msa.customer_id = p.customer_id
        AND p.account_type IN ('municipaladmin', 'municipaluser')
      )
    );

    -- Municipal users can create comments for applications in their jurisdiction
    DROP POLICY IF EXISTS "Municipal users can create service application comments" ON public.municipal_service_application_comments;
    CREATE POLICY "Municipal users can create service application comments"
    ON public.municipal_service_application_comments
    FOR INSERT
    WITH CHECK (
      reviewer_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.municipal_service_applications msa
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE msa.id = municipal_service_application_comments.application_id
        AND msa.customer_id = p.customer_id
        AND p.account_type IN ('municipaladmin', 'municipaluser')
      )
    );

    -- Super admins can do everything with service application comments
    DROP POLICY IF EXISTS "Super admins can manage service application comments" ON public.municipal_service_application_comments;
    CREATE POLICY "Super admins can manage service application comments"
    ON public.municipal_service_application_comments
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND account_type = 'superadmin'
      )
    );
  END IF;
END $$;
