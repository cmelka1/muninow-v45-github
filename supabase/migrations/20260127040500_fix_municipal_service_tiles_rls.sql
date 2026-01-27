-- Fix RLS for municipal_service_tiles to ensure municipal admins can INSERT
-- This ensures sport facility creation works for municipal admins

-- Using defensive DO block pattern for safety
DO $$ 
BEGIN
  -- Check if table exists before modifying policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipal_service_tiles') THEN
    -- Drop any conflicting policies first
    DROP POLICY IF EXISTS "Municipal admins and users can manage service tiles for their customer" ON public.municipal_service_tiles;
    DROP POLICY IF EXISTS "Municipal users can manage service tiles for their customer" ON public.municipal_service_tiles;
    DROP POLICY IF EXISTS "Municipal users can manage tiles for their customer" ON public.municipal_service_tiles;
    DROP POLICY IF EXISTS "municipal_manage_service_tiles" ON public.municipal_service_tiles;
    
    -- Create comprehensive policy for municipal users (ALL operations)
    CREATE POLICY "Municipal users manage service tiles" ON public.municipal_service_tiles
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = municipal_service_tiles.customer_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.account_type IN ('municipaladmin', 'municipaluser')
        AND profiles.customer_id = municipal_service_tiles.customer_id
      )
    );
    
    RAISE NOTICE 'Successfully created RLS policy for municipal_service_tiles';
  ELSE
    RAISE NOTICE 'Table municipal_service_tiles does not exist, skipping';
  END IF;
END $$;
