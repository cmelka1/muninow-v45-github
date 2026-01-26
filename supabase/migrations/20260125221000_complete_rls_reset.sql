-- =============================================================================
-- COMPREHENSIVE RLS POLICY RESET
-- Drops ALL existing policies and recreates with uniform profiles.account_type patterns
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTION: Create standard policies for common table patterns
-- We'll use DO blocks to create policies only if tables exist
-- =============================================================================

-- =============================================================================
-- PHASE 1: DROP ALL EXISTING POLICIES
-- Uses pg_policies catalog to find and drop all policies on public tables
-- =============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Loop through all policies in the public schema and drop them
  FOR policy_record IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      policy_record.policyname, 
      policy_record.schemaname, 
      policy_record.tablename);
  END LOOP;
END $$;

-- =============================================================================
-- PHASE 2: RECREATE POLICIES FOR EACH TABLE
-- Using uniform patterns based on profiles.account_type
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Users can view their own profile
    CREATE POLICY "Users can view own profile" ON public.profiles 
      FOR SELECT USING (id = auth.uid());
    
    -- Users can update their own profile
    CREATE POLICY "Users can update own profile" ON public.profiles 
      FOR UPDATE USING (id = auth.uid());
    
    -- SuperAdmins can view all profiles
    CREATE POLICY "SuperAdmin full access to profiles" ON public.profiles
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- CUSTOMERS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    -- Users can view their own customer record
    CREATE POLICY "Users can view own customer" ON public.customers 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can update their own customer record
    CREATE POLICY "Users can update own customer" ON public.customers 
      FOR UPDATE USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to customers" ON public.customers 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- MERCHANTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchants') THEN
    -- Users can view their own merchants
    CREATE POLICY "Users can view own merchants" ON public.merchants 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own merchants
    CREATE POLICY "Users can insert own merchants" ON public.merchants 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- Users can update their own merchants
    CREATE POLICY "Users can update own merchants" ON public.merchants 
      FOR UPDATE USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to merchants" ON public.merchants 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can view merchants in their customer
    CREATE POLICY "Municipal admins view customer merchants" ON public.merchants
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.account_type = 'municipaladmin' 
        AND p.customer_id = merchants.customer_id
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BUSINESS_LICENSE_APPLICATIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_applications') THEN
    -- Users can view their own applications
    CREATE POLICY "Users can view own license applications" ON public.business_license_applications 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own applications
    CREATE POLICY "Users can insert own license applications" ON public.business_license_applications 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- Users can update their own draft applications
    CREATE POLICY "Users can update own draft applications" ON public.business_license_applications 
      FOR UPDATE USING (user_id = auth.uid() AND application_status = 'draft');
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to license applications" ON public.business_license_applications 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can view/update their customer's applications
    CREATE POLICY "Municipal admins manage customer applications" ON public.business_license_applications
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.account_type = 'municipaladmin' 
        AND p.customer_id = business_license_applications.customer_id
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BUSINESS_LICENSE_TYPES_V2 TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_types_v2') THEN
    -- Public can read active license types
    CREATE POLICY "Public can read active license types" ON public.business_license_types_v2 
      FOR SELECT USING (is_active = true);
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to license types" ON public.business_license_types_v2 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can manage their customer's license types
    CREATE POLICY "Municipal admins manage customer license types" ON public.business_license_types_v2
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.account_type = 'municipaladmin' 
        AND p.customer_id = business_license_types_v2.customer_id
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BUSINESS_LICENSE_DOCUMENTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_documents') THEN
    -- Users can view their own documents
    CREATE POLICY "Users can view own license documents" ON public.business_license_documents 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own documents
    CREATE POLICY "Users can insert own license documents" ON public.business_license_documents 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to license documents" ON public.business_license_documents 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can view their customer's documents
    CREATE POLICY "Municipal admins view customer license documents" ON public.business_license_documents
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.account_type = 'municipaladmin' 
        AND p.customer_id = business_license_documents.customer_id
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BUSINESS_LICENSE_COMMENTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_comments') THEN
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to license comments" ON public.business_license_comments 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can manage comments
    CREATE POLICY "Municipal admins manage license comments" ON public.business_license_comments
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'municipaladmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- BUSINESS_LICENSE_RENEWAL_HISTORY TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_license_renewal_history') THEN
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to renewal history" ON public.business_license_renewal_history 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- MERCHANT_FEE_PROFILES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchant_fee_profiles') THEN
    -- Users can view their own fee profiles (via merchant)
    CREATE POLICY "Users can view own fee profiles" ON public.merchant_fee_profiles 
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.merchants m 
        WHERE m.id = merchant_fee_profiles.merchant_id 
        AND m.user_id = auth.uid()
      ));
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to fee profiles" ON public.merchant_fee_profiles 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- MERCHANT_PAYOUT_PROFILES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchant_payout_profiles') THEN
    -- Users can view their own payout profiles
    CREATE POLICY "Users can view own payout profiles" ON public.merchant_payout_profiles 
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.merchants m 
        WHERE m.id = merchant_payout_profiles.merchant_id 
        AND m.user_id = auth.uid()
      ));
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to payout profiles" ON public.merchant_payout_profiles 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- SERVICE_APPLICATIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_applications') THEN
    -- Users can view their own applications
    CREATE POLICY "Users can view own service applications" ON public.service_applications 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own applications
    CREATE POLICY "Users can insert own service applications" ON public.service_applications 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- Users can update their own applications
    CREATE POLICY "Users can update own service applications" ON public.service_applications 
      FOR UPDATE USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to service applications" ON public.service_applications 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can manage customer applications
    CREATE POLICY "Municipal admins manage service applications" ON public.service_applications
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.account_type = 'municipaladmin' 
        AND p.customer_id = service_applications.customer_id
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- SERVICE_APPLICATION_DOCUMENTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_application_documents') THEN
    -- Users can view their own documents
    CREATE POLICY "Users can view own service documents" ON public.service_application_documents 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own documents
    CREATE POLICY "Users can insert own service documents" ON public.service_application_documents 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to service documents" ON public.service_application_documents 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TAX_SUBMISSIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_submissions') THEN
    -- Users can view their own submissions
    CREATE POLICY "Users can view own tax submissions" ON public.tax_submissions 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own submissions
    CREATE POLICY "Users can insert own tax submissions" ON public.tax_submissions 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- Users can update their own submissions
    CREATE POLICY "Users can update own tax submissions" ON public.tax_submissions 
      FOR UPDATE USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to tax submissions" ON public.tax_submissions 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TAX_SUBMISSION_DOCUMENTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_submission_documents') THEN
    -- Users can view their own documents
    CREATE POLICY "Users can view own tax documents" ON public.tax_submission_documents 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own documents  
    CREATE POLICY "Users can insert own tax documents" ON public.tax_submission_documents 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to tax documents" ON public.tax_submission_documents 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TAX_DOCUMENTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_documents') THEN
    -- Users can view their own documents
    CREATE POLICY "Users can view own tax docs" ON public.tax_documents 
      FOR SELECT USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to tax docs" ON public.tax_documents 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- TAX_CALCULATIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_calculations') THEN
    -- Users can view their own calculations
    CREATE POLICY "Users can view own tax calculations" ON public.tax_calculations 
      FOR SELECT USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to tax calculations" ON public.tax_calculations 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PERMIT_APPLICATIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_applications') THEN
    -- Users can view their own permits
    CREATE POLICY "Users can view own permits" ON public.permit_applications 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own permits
    CREATE POLICY "Users can insert own permits" ON public.permit_applications 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- Users can update their own permits
    CREATE POLICY "Users can update own permits" ON public.permit_applications 
      FOR UPDATE USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to permits" ON public.permit_applications 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can manage customer permits
    CREATE POLICY "Municipal admins manage customer permits" ON public.permit_applications
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.account_type = 'municipaladmin' 
        AND p.customer_id = permit_applications.customer_id
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PERMIT_TYPES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_types') THEN
    -- Public can read active permit types
    CREATE POLICY "Public can read permit types" ON public.permit_types 
      FOR SELECT USING (true);
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to permit types" ON public.permit_types 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can manage their customer's permit types
    CREATE POLICY "Municipal admins manage permit types" ON public.permit_types
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.account_type = 'municipaladmin' 
        AND p.customer_id = permit_types.customer_id
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PAYMENT_TRANSACTIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
    -- Users can view their own transactions
    CREATE POLICY "Users can view own transactions" ON public.payment_transactions 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own transactions
    CREATE POLICY "Users can insert own transactions" ON public.payment_transactions 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to transactions" ON public.payment_transactions 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PAYMENT_HISTORY TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_history') THEN
    -- Users can view their own payment history
    CREATE POLICY "Users can view own payment history" ON public.payment_history 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can insert their own payment history
    CREATE POLICY "Users can insert own payment history" ON public.payment_history 
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to payment history" ON public.payment_history 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- USER_NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notifications') THEN
    -- Users can view their own notifications
    CREATE POLICY "Users can view own notifications" ON public.user_notifications 
      FOR SELECT USING (user_id = auth.uid());
    
    -- Users can update their own notifications (mark read)
    CREATE POLICY "Users can update own notifications" ON public.user_notifications 
      FOR UPDATE USING (user_id = auth.uid());
    
    -- System can insert notifications (via service role)
    CREATE POLICY "System can insert notifications" ON public.user_notifications 
      FOR INSERT WITH CHECK (true);
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to notifications" ON public.user_notifications 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- USER_NOTIFICATION_PREFERENCES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notification_preferences') THEN
    -- Users can manage their own preferences
    CREATE POLICY "Users can manage own notification preferences" ON public.user_notification_preferences 
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- USER_PAYMENT_INSTRUMENTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_payment_instruments') THEN
    -- Users can manage their own payment instruments
    CREATE POLICY "Users can manage own payment instruments" ON public.user_payment_instruments 
      FOR ALL USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to payment instruments" ON public.user_payment_instruments 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- FINIX_IDENTITIES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finix_identities') THEN
    -- Users can view their own identities
    CREATE POLICY "Users can view own finix identities" ON public.finix_identities 
      FOR SELECT USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to finix identities" ON public.finix_identities 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- FINIX_DISPUTES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finix_disputes') THEN
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to finix disputes" ON public.finix_disputes 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
    
    -- Municipal admins can view disputes
    CREATE POLICY "Municipal admins view disputes" ON public.finix_disputes
      FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'municipaladmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- FRAUD_ATTEMPTS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fraud_attempts') THEN
    -- SuperAdmins and Municipal admins can view
    CREATE POLICY "Admins can view fraud attempts" ON public.fraud_attempts 
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND account_type IN ('superadmin', 'municipaladmin')
      ));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- FRAUD_SESSIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fraud_sessions') THEN
    -- SuperAdmins and Municipal admins can view
    CREATE POLICY "Admins can view fraud sessions" ON public.fraud_sessions 
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND account_type IN ('superadmin', 'municipaladmin')
      ));
    
    -- Anyone can insert (for fraud tracking)
    CREATE POLICY "Anyone can insert fraud sessions" ON public.fraud_sessions 
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- VEHICLES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicles') THEN
    -- Users can manage their own vehicles
    CREATE POLICY "Users can manage own vehicles" ON public.vehicles 
      FOR ALL USING (user_id = auth.uid());
    
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to vehicles" ON public.vehicles 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- VERIFICATION_CODES TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification_codes') THEN
    -- Users can view/use their own codes
    CREATE POLICY "Users can manage own verification codes" ON public.verification_codes 
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- VENDOR_TERRITORY_MAPPINGS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_territory_mappings') THEN
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to territory mappings" ON public.vendor_territory_mappings 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- MUNICIPAL_INVITATIONS TABLE
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_invitations') THEN
    -- SuperAdmins can do everything
    CREATE POLICY "SuperAdmin full access to municipal invitations" ON public.municipal_invitations 
      FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'superadmin'));
  END IF;
END $$;
