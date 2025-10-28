-- Drop the old restrictive SELECT policy that only allows account_type = 'municipal'
DROP POLICY IF EXISTS "Municipal users can view permit applications for their customer" 
ON public.permit_applications;

-- Drop the old restrictive UPDATE policy that only allows account_type = 'municipal'
DROP POLICY IF EXISTS "Municipal users can update permit applications for their custom" 
ON public.permit_applications;

-- The remaining policies use has_municipal_access_to_customer() which correctly supports:
-- 'municipal', 'municipaladmin', and 'municipaluser' account types