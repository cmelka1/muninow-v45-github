-- Migration: final_cleanup_phase_2_v2_schema
-- Description: Fix initialize function and drop all deprecated Phase 2 tables/functions
-- Safe to run: All data migrated, 0 active references verified

-- ============================================
-- STEP 1: Fix initialize_standard_business_license_types function
-- ============================================

DROP FUNCTION IF EXISTS public.initialize_standard_business_license_types(UUID);

CREATE OR REPLACE FUNCTION public.initialize_standard_business_license_types(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merchant_record RECORD;
BEGIN
  -- Get the business licenses merchant for this customer
  SELECT id, merchant_name INTO merchant_record
  FROM public.merchants 
  WHERE customer_id = p_customer_id 
    AND subcategory = 'Business Licenses'
  LIMIT 1;
  
  -- If no merchant found, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Insert standard business license types directly into business_license_types_v2
  -- These are the core types that every municipality should have
  INSERT INTO public.business_license_types_v2 (
    customer_id,
    merchant_id,
    merchant_name,
    name,
    base_fee_cents,
    is_custom,
    display_order,
    description,
    processing_days,
    is_active
  )
  SELECT 
    p_customer_id,
    merchant_record.id,
    merchant_record.merchant_name,
    standard_type.name,
    standard_type.base_fee_cents,
    false, -- Not custom since they're standard types
    standard_type.display_order,
    standard_type.description,
    7, -- Default 7 days processing
    true
  FROM (VALUES
    ('General Business License', 10000, 0, 'Standard business license for general business operations'),
    ('Home-Based Business', 5000, 1, 'License for businesses operated from a residential property'),
    ('Retail License', 15000, 2, 'License for retail store operations'),
    ('Food Service License', 20000, 3, 'License for restaurants and food service establishments'),
    ('Professional Services', 7500, 4, 'License for professional service providers'),
    ('Contractor License', 12500, 5, 'License for contractors and construction services'),
    ('Other', 0, 999, 'For business types not covered by standard categories')
  ) AS standard_type(name, base_fee_cents, display_order, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.business_license_types_v2 blt
    WHERE blt.customer_id = p_customer_id
      AND blt.name = standard_type.name
      AND blt.is_custom = false
  );
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.initialize_standard_business_license_types(UUID) IS 
'Initializes standard business license types for a new municipality. Uses business_license_types_v2 unified schema.';

-- ============================================
-- STEP 2: Drop deprecated tables
-- ============================================

DROP TABLE IF EXISTS public.business_license_types_deprecated CASCADE;
DROP TABLE IF EXISTS public.municipal_business_license_types_deprecated CASCADE;
DROP TABLE IF EXISTS public.permit_types_deprecated CASCADE;
DROP TABLE IF EXISTS public.municipal_permit_types_deprecated CASCADE;
DROP TABLE IF EXISTS public.business_license_number_sequences CASCADE;

-- ============================================
-- STEP 3: Drop deprecated RPC functions
-- ============================================

DROP FUNCTION IF EXISTS public.get_municipal_business_license_types(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_municipal_business_license_type(UUID, UUID, TEXT, BIGINT, INTEGER, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.update_municipal_business_license_type(UUID, TEXT, BIGINT, INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.delete_municipal_business_license_type(UUID) CASCADE;

DROP FUNCTION IF EXISTS public.get_municipal_permit_types(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_municipal_permit_type(UUID, UUID, TEXT, TEXT, BIGINT, INTEGER, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.update_municipal_permit_type(UUID, TEXT, TEXT, BIGINT, INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.delete_municipal_permit_type(UUID) CASCADE;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify no orphaned records
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Check business licenses
  SELECT COUNT(*) INTO orphaned_count
  FROM business_license_applications bla
  LEFT JOIN business_license_types_v2 blt ON blt.id = bla.license_type_id
  WHERE blt.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned business license applications', orphaned_count;
  END IF;
  
  -- Check permits
  SELECT COUNT(*) INTO orphaned_count
  FROM permit_applications pa
  LEFT JOIN permit_types_v2 pt ON pt.id = pa.permit_type_id
  WHERE pt.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned permit applications', orphaned_count;
  END IF;
  
  RAISE NOTICE 'Phase 2 Final Cleanup verification passed: 0 orphaned records, all deprecated objects removed';
END $$;