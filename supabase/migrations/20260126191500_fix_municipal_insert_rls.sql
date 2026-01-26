-- =============================================================================
-- FIX MUNICIPAL RLS POLICIES - RESTORE ORIGINAL FUNCTION-BASED APPROACH
-- =============================================================================
-- The complete_rls_reset.sql replaced function-based policies with inline checks
-- that only allow 'municipaladmin' accounts. This fix restores the original
-- function-based approach that properly supports all municipal roles.

-- =============================================================================
-- STEP 1: DROP ALL EXISTING MUNICIPAL-RELATED POLICIES ON BUSINESS_LICENSE_TYPES_V2
-- =============================================================================
DROP POLICY IF EXISTS "Municipal admins manage customer license types" ON public.business_license_types_v2;
DROP POLICY IF EXISTS "municipal_manage_business_license_types_v2" ON public.business_license_types_v2;

-- =============================================================================
-- STEP 2: RECREATE USING ORIGINAL HELPER FUNCTION (supports all municipal roles)
-- =============================================================================
CREATE POLICY "Municipal users manage business license types" ON public.business_license_types_v2
  FOR ALL
  TO authenticated
  USING (has_municipal_access_to_customer(auth.uid(), customer_id))
  WITH CHECK (has_municipal_access_to_customer(auth.uid(), customer_id));

-- =============================================================================
-- STEP 3: FIX PERMIT_TYPES_V2 TABLE
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_types_v2') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal admins manage permit types" ON public.permit_types_v2;
    DROP POLICY IF EXISTS "municipal_manage_permit_types_v2" ON public.permit_types_v2;
    
    -- Recreate using helper function
    CREATE POLICY "Municipal users manage permit types" ON public.permit_types_v2
      FOR ALL
      TO authenticated
      USING (has_municipal_access_to_customer(auth.uid(), customer_id))
      WITH CHECK (has_municipal_access_to_customer(auth.uid(), customer_id));
  END IF;
END $$;

-- =============================================================================
-- DEBUG: Verify the has_municipal_access_to_customer function exists
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_municipal_access_to_customer'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: has_municipal_access_to_customer function does not exist! Please run migration 20250911174948.';
  END IF;
END $$;
