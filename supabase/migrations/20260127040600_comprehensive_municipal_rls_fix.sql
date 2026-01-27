-- Comprehensive RLS Fix for Municipal Admin INSERT Operations
-- Ensures municipal admins can create/manage all service-related tables

-- =============================================================================
-- MUNICIPAL_SERVICE_TILES (Sport Facilities, Services, etc.)
-- Already fixed in previous migration - skip for safety
-- =============================================================================

-- =============================================================================  
-- MUNICIPAL_TAX_TYPES (Custom Tax Types Configuration)
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_tax_types') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal users can manage tax types for their customer" ON public.municipal_tax_types;
    DROP POLICY IF EXISTS "Municipal admins manage tax types" ON public.municipal_tax_types;
    DROP POLICY IF EXISTS "Municipal users manage tax types" ON public.municipal_tax_types;
    DROP POLICY IF EXISTS "municipal_manage_tax_types" ON public.municipal_tax_types;
    
    -- Create comprehensive policy for ALL operations
    CREATE POLICY "Municipal users manage tax types" ON public.municipal_tax_types
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = municipal_tax_types.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = municipal_tax_types.customer_id
      )
    );
    
    RAISE NOTICE 'Fixed RLS for municipal_tax_types';
  END IF;
END $$;

-- =============================================================================
-- PERMIT_TYPES_V2 (Custom Permit Types)
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_types_v2') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal users manage permit types" ON public.permit_types_v2;
    DROP POLICY IF EXISTS "Municipal admins manage permit types" ON public.permit_types_v2;
    DROP POLICY IF EXISTS "municipal_manage_permit_types" ON public.permit_types_v2;
    
    -- Create comprehensive policy for ALL operations
    CREATE POLICY "Municipal users manage permit types" ON public.permit_types_v2
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = permit_types_v2.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = permit_types_v2.customer_id
      )
    );
    
    RAISE NOTICE 'Fixed RLS for permit_types_v2';
  END IF;
END $$;

-- =============================================================================
-- LICENSE_TYPES (Business License Types)
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'license_types') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal users manage license types" ON public.license_types;
    DROP POLICY IF EXISTS "Municipal admins manage license types" ON public.license_types;
    DROP POLICY IF EXISTS "municipal_manage_license_types" ON public.license_types;
    
    -- Create comprehensive policy for ALL operations
    CREATE POLICY "Municipal users manage license types" ON public.license_types
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = license_types.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = license_types.customer_id
      )
    );
    
    RAISE NOTICE 'Fixed RLS for license_types';
  END IF;
END $$;

-- =============================================================================
-- PROCESSING_TIMES (Estimated Processing Times Configuration)
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'processing_times') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal users manage processing times" ON public.processing_times;
    DROP POLICY IF EXISTS "Municipal admins manage processing times" ON public.processing_times;
    DROP POLICY IF EXISTS "municipal_manage_processing_times" ON public.processing_times;
    
    -- Create comprehensive policy for ALL operations
    CREATE POLICY "Municipal users manage processing times" ON public.processing_times
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = processing_times.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = processing_times.customer_id
      )
    );
    
    RAISE NOTICE 'Fixed RLS for processing_times';
  END IF;
END $$;

-- =============================================================================
-- PERMIT_INSPECTION_TEMPLATES (Inspection Templates)
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_inspection_templates') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal users manage inspection templates" ON public.permit_inspection_templates;
    DROP POLICY IF EXISTS "Municipal admins manage inspection templates" ON public.permit_inspection_templates;
    
    -- Create comprehensive policy for ALL operations
    CREATE POLICY "Municipal users manage inspection templates" ON public.permit_inspection_templates
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = permit_inspection_templates.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = permit_inspection_templates.customer_id
      )
    );
    
    RAISE NOTICE 'Fixed RLS for permit_inspection_templates';
  END IF;
END $$;

-- =============================================================================
-- PERMIT_QUESTIONS (Permit Application Questions)
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_questions') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal users manage permit questions" ON public.permit_questions;
    DROP POLICY IF EXISTS "Municipal admins manage permit questions" ON public.permit_questions;
    
    -- Create comprehensive policy for ALL operations
    CREATE POLICY "Municipal users manage permit questions" ON public.permit_questions
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.permit_types_v2 pt ON pt.id = permit_questions.permit_type_id
        WHERE p.id = auth.uid() 
        AND p.account_type IN ('municipaladmin', 'municipaluser')
        AND p.customer_id = pt.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.permit_types_v2 pt ON pt.id = permit_questions.permit_type_id
        WHERE p.id = auth.uid() 
        AND p.account_type IN ('municipaladmin', 'municipaluser')
        AND p.customer_id = pt.customer_id
      )
    );
    
    RAISE NOTICE 'Fixed RLS for permit_questions';
  END IF;
END $$;

-- =============================================================================
-- BOOKING_TIME_SLOTS (Facility Time Slot Availability)
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_time_slots') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Municipal users manage time slots" ON public.booking_time_slots;
    DROP POLICY IF EXISTS "Municipal admins manage time slots" ON public.booking_time_slots;
    
    -- Create comprehensive policy for ALL operations
    CREATE POLICY "Municipal users manage time slots" ON public.booking_time_slots
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.municipal_service_tiles mst ON mst.id = booking_time_slots.service_tile_id
        WHERE p.id = auth.uid() 
        AND p.account_type IN ('municipaladmin', 'municipaluser')
        AND p.customer_id = mst.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.municipal_service_tiles mst ON mst.id = booking_time_slots.service_tile_id
        WHERE p.id = auth.uid() 
        AND p.account_type IN ('municipaladmin', 'municipaluser')
        AND p.customer_id = mst.customer_id
      )
    );
    
    RAISE NOTICE 'Fixed RLS for booking_time_slots';
  END IF;
END $$;
