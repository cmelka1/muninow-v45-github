-- Fix RLS policies for municipal_service_applications table
-- The existing policies use 'municipal' account_type but the app now uses 'municipaladmin' and 'municipaluser'
-- This migration fixes the SELECT and UPDATE policies for municipal staff

-- =============================================================================
-- DROP existing municipal policies (they use outdated account_type)
-- =============================================================================
DROP POLICY IF EXISTS "Municipal users can view applications for their customer" ON public.municipal_service_applications;
DROP POLICY IF EXISTS "Municipal users can update applications for their customer" ON public.municipal_service_applications;

-- =============================================================================
-- CREATE new policies with correct account_type values
-- =============================================================================

-- SELECT policy for municipal staff
CREATE POLICY "Municipal staff view applications for their municipality"
ON public.municipal_service_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipaladmin', 'municipaluser')
    AND profiles.customer_id = municipal_service_applications.customer_id
  )
);

-- UPDATE policy for municipal staff 
CREATE POLICY "Municipal staff update applications for their municipality"
ON public.municipal_service_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipaladmin', 'municipaluser')
    AND profiles.customer_id = municipal_service_applications.customer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipaladmin', 'municipaluser')
    AND profiles.customer_id = municipal_service_applications.customer_id
  )
);

-- Also fix the municipal_service_tiles policy if needed
DROP POLICY IF EXISTS "Municipal users can manage tiles for their customer" ON public.municipal_service_tiles;

CREATE POLICY "Municipal staff manage tiles for their municipality"
ON public.municipal_service_tiles
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
