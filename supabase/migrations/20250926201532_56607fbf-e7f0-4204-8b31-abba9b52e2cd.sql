-- Fix RLS policy for business_license_number_sequences to allow proper license application flow
-- The issue: business/resident users don't have customer_id matching the municipality they're applying to
-- The solution: Allow all authenticated users to read sequences, and allow insert/update for license generation

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can manage sequences for their customer" ON public.business_license_number_sequences;

-- Allow all authenticated users to SELECT sequences (needed for license number generation)
CREATE POLICY "Authenticated users can read sequences" 
ON public.business_license_number_sequences
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to INSERT/UPDATE sequences (the generate_license_number function controls the customer_id)
CREATE POLICY "Authenticated users can insert sequences" 
ON public.business_license_number_sequences
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sequences" 
ON public.business_license_number_sequences
FOR UPDATE
TO authenticated
USING (true);

-- Keep DELETE restricted to super admins only
CREATE POLICY "Super admins can delete sequences" 
ON public.business_license_number_sequences
FOR DELETE
TO authenticated
USING (is_current_user_super_admin());