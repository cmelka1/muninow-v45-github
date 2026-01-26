-- =============================================================================
-- Role System Consolidation Migration (Defensive Version)
-- Deprecates user_roles/roles tables and consolidates on profiles.account_type
-- Uses DO blocks to check table existence before creating policies
-- =============================================================================

-- =============================================================================
-- PHASE 1: UPDATE RLS POLICIES
-- Replace all user_roles JOIN roles patterns with profiles.account_type checks
-- Only update policies on tables that actually exist
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CUSTOMERS TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    DROP POLICY IF EXISTS "Super admins can view all customers" ON public.customers;
    DROP POLICY IF EXISTS "Super admins can insert customers" ON public.customers;
    DROP POLICY IF EXISTS "Super admins can update customers" ON public.customers;
    DROP POLICY IF EXISTS "Super admins can delete customers" ON public.customers;
    
    CREATE POLICY "Super admins can view all customers" ON public.customers FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can insert customers" ON public.customers FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can update customers" ON public.customers FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can delete customers" ON public.customers FOR DELETE 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- MERCHANTS TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchants') THEN
    DROP POLICY IF EXISTS "Super admins can view all merchants" ON public.merchants;
    DROP POLICY IF EXISTS "Super admins can insert merchants" ON public.merchants;
    DROP POLICY IF EXISTS "Super admins can update merchants" ON public.merchants;
    
    CREATE POLICY "Super admins can view all merchants" ON public.merchants FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can insert merchants" ON public.merchants FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can update merchants" ON public.merchants FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- MERCHANT_PAYOUT_PROFILES TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchant_payout_profiles') THEN
    DROP POLICY IF EXISTS "Super admins can view all merchant payout profiles" ON public.merchant_payout_profiles;
    DROP POLICY IF EXISTS "Super admins can insert merchant payout profiles" ON public.merchant_payout_profiles;
    DROP POLICY IF EXISTS "Super admins can update merchant payout profiles" ON public.merchant_payout_profiles;
    
    CREATE POLICY "Super admins can view all merchant payout profiles" ON public.merchant_payout_profiles FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can insert merchant payout profiles" ON public.merchant_payout_profiles FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can update merchant payout profiles" ON public.merchant_payout_profiles FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- MERCHANT_FEE_PROFILES TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchant_fee_profiles') THEN
    DROP POLICY IF EXISTS "Super admins can view all merchant fee profiles" ON public.merchant_fee_profiles;
    DROP POLICY IF EXISTS "Super admins can insert merchant fee profiles" ON public.merchant_fee_profiles;
    DROP POLICY IF EXISTS "Super admins can update merchant fee profiles" ON public.merchant_fee_profiles;
    DROP POLICY IF EXISTS "Super admins can delete merchant fee profiles" ON public.merchant_fee_profiles;
    DROP POLICY IF EXISTS "SuperAdmins can view all fee profiles" ON public.merchant_fee_profiles;
    DROP POLICY IF EXISTS "SuperAdmins can insert fee profiles" ON public.merchant_fee_profiles;
    DROP POLICY IF EXISTS "SuperAdmins can update fee profiles" ON public.merchant_fee_profiles;
    DROP POLICY IF EXISTS "SuperAdmins can delete fee profiles" ON public.merchant_fee_profiles;
    
    CREATE POLICY "Super admins can view all merchant fee profiles" ON public.merchant_fee_profiles FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can insert merchant fee profiles" ON public.merchant_fee_profiles FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can update merchant fee profiles" ON public.merchant_fee_profiles FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
    
    CREATE POLICY "Super admins can delete merchant fee profiles" ON public.merchant_fee_profiles FOR DELETE 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PERMIT_APPLICATIONS TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_applications') THEN
    DROP POLICY IF EXISTS "Super admins can view all permit applications" ON public.permit_applications;
    
    CREATE POLICY "Super admins can view all permit applications" ON public.permit_applications FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PERMIT_TYPES TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_types') THEN
    DROP POLICY IF EXISTS "Super admins can manage permit types" ON public.permit_types;
    
    CREATE POLICY "Super admins can manage permit types" ON public.permit_types FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- FRAUD_ATTEMPTS TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fraud_attempts') THEN
    DROP POLICY IF EXISTS "Municipal admins can view all fraud attempts" ON public.fraud_attempts;
    
    CREATE POLICY "Municipal admins can view all fraud attempts" ON public.fraud_attempts FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type IN ('superadmin', 'municipaladmin')));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- FRAUD_SESSIONS TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fraud_sessions') THEN
    DROP POLICY IF EXISTS "Municipal admins can view all fraud sessions" ON public.fraud_sessions;
    
    CREATE POLICY "Municipal admins can view all fraud sessions" ON public.fraud_sessions FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type IN ('superadmin', 'municipaladmin')));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- VENDOR_TERRITORY_MAPPINGS TABLE POLICIES
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_territory_mappings') THEN
    DROP POLICY IF EXISTS "Super admins can manage territory mappings" ON public.vendor_territory_mappings;
    
    CREATE POLICY "Super admins can manage territory mappings" ON public.vendor_territory_mappings FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.account_type = 'superadmin'));
  END IF;
END $$;

-- =============================================================================
-- PHASE 2: DROP VIEWS (must drop before tables due to dependencies)
-- =============================================================================
DROP VIEW IF EXISTS public.user_roles_detailed CASCADE;
DROP VIEW IF EXISTS public.role_migration_backup CASCADE;
DROP VIEW IF EXISTS public.role_migration_results CASCADE;

-- =============================================================================
-- PHASE 3: DROP TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS sync_profiles_to_user_roles ON public.profiles;
DROP TRIGGER IF EXISTS sync_roles_to_user_roles ON public.roles;

-- =============================================================================
-- PHASE 4: DROP FUNCTIONS
-- =============================================================================
DROP FUNCTION IF EXISTS public.get_user_roles(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_roles_data() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_roles_role_data() CASCADE;

-- =============================================================================
-- PHASE 5: DROP INDEXES
-- =============================================================================
DROP INDEX IF EXISTS public.idx_user_roles_user_id_role_id;
DROP INDEX IF EXISTS public.idx_user_roles_entity_id;

-- =============================================================================
-- PHASE 6: DROP TABLES (order matters for FK constraints)
-- =============================================================================
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- =============================================================================
-- PHASE 7: CLEANUP - Drop app_role enum if still exists
-- =============================================================================
DROP TYPE IF EXISTS public.app_role CASCADE;
