-- Update RLS policies for municipal_service_tiles to only allow municipaladmin and municipaluser

-- Drop existing municipal policies that reference 'municipal' account type
DROP POLICY IF EXISTS "Municipal users can manage service tiles for their customer" ON public.municipal_service_tiles;
DROP POLICY IF EXISTS "Municipal users can manage tiles for their customer" ON public.municipal_service_tiles;

-- Create updated policies that only allow municipaladmin and municipaluser
CREATE POLICY "Municipal admins and users can manage service tiles for their customer"
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