-- =============================================================================
-- FIX MUNICIPAL RLS POLICIES - RESTORE ORIGINAL FUNCTION-BASED APPROACH
-- =============================================================================
-- The complete_rls_reset.sql replaced function-based policies with inline checks
-- that only allow 'municipaladmin' accounts. This fix restores the original
-- function-based approach that properly supports all municipal roles.

-- =============================================================================
-- STEP 1: FIX BUSINESS_LICENSE_TYPES_V2
-- =============================================================================
DROP POLICY IF EXISTS "Municipal admins manage customer license types" ON public.business_license_types_v2;
DROP POLICY IF EXISTS "municipal_manage_business_license_types_v2" ON public.business_license_types_v2;
DROP POLICY IF EXISTS "Municipal users manage business license types" ON public.business_license_types_v2;

CREATE POLICY "Municipal users manage business license types" ON public.business_license_types_v2
  FOR ALL
  TO authenticated
  USING (has_municipal_access_to_customer(auth.uid(), customer_id))
  WITH CHECK (has_municipal_access_to_customer(auth.uid(), customer_id));

-- =============================================================================
-- STEP 2: FIX PERMIT_TYPES_V2
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_types_v2') THEN
    DROP POLICY IF EXISTS "Municipal admins manage permit types" ON public.permit_types_v2;
    DROP POLICY IF EXISTS "municipal_manage_permit_types_v2" ON public.permit_types_v2;
    DROP POLICY IF EXISTS "Municipal users manage permit types" ON public.permit_types_v2;
    
    CREATE POLICY "Municipal users manage permit types" ON public.permit_types_v2
      FOR ALL
      TO authenticated
      USING (has_municipal_access_to_customer(auth.uid(), customer_id))
      WITH CHECK (has_municipal_access_to_customer(auth.uid(), customer_id));
  END IF;
END $$;

-- =============================================================================
-- STEP 3: FIX MUNICIPAL_PERMIT_QUESTIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_permit_questions') THEN
    DROP POLICY IF EXISTS "Municipal users can manage permit questions for their customer" ON public.municipal_permit_questions;
    DROP POLICY IF EXISTS "Municipal admins manage permit questions" ON public.municipal_permit_questions;
    DROP POLICY IF EXISTS "Municipal users manage permit questions" ON public.municipal_permit_questions;
    
    CREATE POLICY "Municipal users manage permit questions" ON public.municipal_permit_questions
      FOR ALL
      TO authenticated
      USING (has_municipal_access_to_customer(auth.uid(), customer_id))
      WITH CHECK (has_municipal_access_to_customer(auth.uid(), customer_id));
  END IF;
END $$;

-- =============================================================================
-- STEP 4: FIX MUNICIPAL_TAX_TYPES
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_tax_types') THEN
    DROP POLICY IF EXISTS "Municipal users manage municipal tax types" ON public.municipal_tax_types;
    DROP POLICY IF EXISTS "Municipal admins manage tax types" ON public.municipal_tax_types;
    DROP POLICY IF EXISTS "municipal_manage_tax_types" ON public.municipal_tax_types;
    DROP POLICY IF EXISTS "Municipal users manage tax types" ON public.municipal_tax_types;
    
    CREATE POLICY "Municipal users manage tax types" ON public.municipal_tax_types
      FOR ALL
      TO authenticated
      USING (has_municipal_access_to_customer(auth.uid(), customer_id))
      WITH CHECK (has_municipal_access_to_customer(auth.uid(), customer_id));
  END IF;
END $$;

-- =============================================================================
-- VERIFY: has_municipal_access_to_customer function exists
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_municipal_access_to_customer'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: has_municipal_access_to_customer function does not exist!';
  END IF;
END $$;

