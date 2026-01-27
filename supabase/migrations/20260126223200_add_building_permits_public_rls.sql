-- =============================================================================
-- RESTORE PUBLIC ACCESS POLICIES FOR MUNICIPALITY SEARCH AND SERVICE BROWSING
-- =============================================================================
-- The complete_rls_reset.sql migration dropped all existing RLS policies
-- including public access policies needed for:
-- 1. Municipality search (customers, merchants)
-- 2. Service browsing (municipal_service_tiles)
-- 3. Tax type browsing (municipal_tax_types)
-- 4. Permit type browsing (permit_types_v2, municipal_permit_types)
-- 5. Fee calculation display (merchant_fee_profiles)
-- 6. Permit forms (municipal_permit_questions)
-- 7. Inspection templates (inspection_form_templates)
-- This migration restores those policies.

-- =============================================================================
-- CUSTOMERS TABLE - PUBLIC READ ACCESS FOR MUNICIPALITY SEARCH
-- =============================================================================
-- Sport Reservations and Other Services use useMunicipalitySearch hook
-- which queries the customers table.

DROP POLICY IF EXISTS "Public can search municipalities" ON public.customers;

CREATE POLICY "Public can search municipalities" 
ON public.customers 
FOR SELECT 
USING (true);

-- =============================================================================
-- MERCHANTS TABLE - PUBLIC ACCESS FOR SERVICE-SPECIFIC MUNICIPALITY SEARCH
-- =============================================================================
-- Building Permits, Business Licenses, and Taxes use merchants table

DROP POLICY IF EXISTS "Allow public read access for Business Licenses merchants" ON public.merchants;
DROP POLICY IF EXISTS "Allow public read access for Tax merchants" ON public.merchants;
DROP POLICY IF EXISTS "Allow public read access for Building Permits merchants" ON public.merchants;

CREATE POLICY "Allow public read access for Business Licenses merchants" 
ON public.merchants 
FOR SELECT 
USING (subcategory = 'Business Licenses');

CREATE POLICY "Allow public read access for Tax merchants" 
ON public.merchants 
FOR SELECT 
USING (subcategory = 'Tax');

CREATE POLICY "Allow public read access for Building Permits merchants" 
ON public.merchants 
FOR SELECT 
USING (subcategory = 'Building Permits');

-- =============================================================================
-- MUNICIPAL_SERVICE_TILES TABLE - PUBLIC READ FOR SERVICE BROWSING
-- =============================================================================
-- Other Services and Sport Reservations use useMunicipalServiceTiles hook

DROP POLICY IF EXISTS "Public can read active service tiles" ON public.municipal_service_tiles;

CREATE POLICY "Public can read active service tiles" 
ON public.municipal_service_tiles 
FOR SELECT 
USING (is_active = true);

-- =============================================================================
-- MUNICIPAL_TAX_TYPES TABLE - PUBLIC READ FOR TAX TYPE SELECTION
-- =============================================================================
-- Tax submissions need to show available tax types to users

DROP POLICY IF EXISTS "Public can read active municipal tax types" ON public.municipal_tax_types;

CREATE POLICY "Public can read active municipal tax types"
ON public.municipal_tax_types
FOR SELECT
USING (is_active = true);

-- =============================================================================
-- PERMIT_TYPES_V2 TABLE - PUBLIC READ FOR PERMIT TYPE SELECTION
-- =============================================================================
-- Permit applications need to show available permit types

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_types_v2') THEN
    DROP POLICY IF EXISTS "public_read_active_permit_types_v2" ON public.permit_types_v2;
    DROP POLICY IF EXISTS "Public can read active permit types" ON public.permit_types_v2;
    
    CREATE POLICY "Public can read active permit types" 
    ON public.permit_types_v2 
    FOR SELECT 
    USING (is_active = true);
  END IF;
END $$;

-- =============================================================================
-- MERCHANT_FEE_PROFILES TABLE - PUBLIC READ FOR FEE CALCULATION
-- =============================================================================
-- Users need to see fee information when applying for services

DROP POLICY IF EXISTS "Allow public read access for Business Licenses merchant fee prof" ON public.merchant_fee_profiles;
DROP POLICY IF EXISTS "Public can read fee profiles for Business Licenses" ON public.merchant_fee_profiles;

CREATE POLICY "Public can read fee profiles for Business Licenses"
ON public.merchant_fee_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM merchants 
    WHERE merchants.id = merchant_fee_profiles.merchant_id 
    AND merchants.subcategory = 'Business Licenses'
  )
);

-- =============================================================================
-- MUNICIPAL_PERMIT_QUESTIONS TABLE - PUBLIC READ FOR PERMIT FORMS
-- =============================================================================
-- Permit application forms need to show questions to users

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_permit_questions') THEN
    DROP POLICY IF EXISTS "Public can read active permit questions" ON public.municipal_permit_questions;
    
    CREATE POLICY "Public can read active permit questions"
    ON public.municipal_permit_questions
    FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

-- =============================================================================
-- MUNICIPAL_PERMIT_TYPES TABLE - PUBLIC READ FOR PERMIT TYPE SELECTION
-- =============================================================================
-- Permit applications need to show municipality-specific permit types

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_permit_types') THEN
    DROP POLICY IF EXISTS "Public can read active municipal permit types for applications" ON public.municipal_permit_types;
    
    CREATE POLICY "Public can read active municipal permit types for applications" 
    ON public.municipal_permit_types 
    FOR SELECT 
    USING (is_active = true);
  END IF;
END $$;

-- =============================================================================
-- INSPECTION_FORM_TEMPLATES TABLE - PUBLIC READ FOR INSPECTORS
-- =============================================================================
-- Inspectors need to download inspection templates

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspection_form_templates') THEN
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.inspection_form_templates;
    DROP POLICY IF EXISTS "Public can read inspection templates" ON public.inspection_form_templates;
    
    CREATE POLICY "Public can read inspection templates"
    ON public.inspection_form_templates
    FOR SELECT
    USING (true);
  END IF;
END $$;
