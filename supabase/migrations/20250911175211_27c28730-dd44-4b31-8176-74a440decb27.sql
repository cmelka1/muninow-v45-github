-- Phase 2 Continuation: Update more RLS Policies

-- Update merchants policies
DROP POLICY IF EXISTS "Municipal users can insert merchants for their customer" ON public.merchants;
DROP POLICY IF EXISTS "Municipal users can update merchants for their customer" ON public.merchants;
DROP POLICY IF EXISTS "Municipal users can view merchants for their customer" ON public.merchants;

CREATE POLICY "Municipal users can insert merchants for their customer" 
ON public.merchants 
FOR INSERT 
WITH CHECK (public.has_municipal_access_to_customer(auth.uid(), customer_id));

CREATE POLICY "Municipal users can update merchants for their customer" 
ON public.merchants 
FOR UPDATE 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

CREATE POLICY "Municipal users can view merchants for their customer" 
ON public.merchants 
FOR SELECT 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

-- Update municipal_business_license_types policies
DROP POLICY IF EXISTS "Municipal users can manage their customer license types" ON public.municipal_business_license_types;

CREATE POLICY "Municipal users can manage their customer license types" 
ON public.municipal_business_license_types 
FOR ALL 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id))
WITH CHECK (public.has_municipal_access_to_customer(auth.uid(), customer_id));

-- Update any permit-related policies that might exist
-- We'll check if permit_applications table has similar issues