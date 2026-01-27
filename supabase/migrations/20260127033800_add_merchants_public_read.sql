-- Add public read access to merchants table for municipality search
-- This allows users to search for municipalities when paying taxes

-- Drop any existing policy with this name to avoid conflicts
DROP POLICY IF EXISTS "Public can read merchants for municipality search" ON public.merchants;

-- Create a policy that allows anyone (authenticated or not) to read basic merchant info
-- This is needed for the tax municipality search autocomplete
CREATE POLICY "Public can read merchants for municipality search"
ON public.merchants
FOR SELECT
USING (true);

-- Add a comment explaining the policy
COMMENT ON POLICY "Public can read merchants for municipality search" ON public.merchants 
IS 'Allows public read access to merchants table for municipality search in tax payment flow';
