-- AUDIT & FIX: RLS Policies for Finix Identities
-- The Signup Form writes directly to this table. We must ensure it is secure and writable.

-- 1. Enable RLS (Security Best Practice)
ALTER TABLE IF EXISTS public.finix_identities ENABLE ROW LEVEL SECURITY;

-- 2. Grant Permissions to Authenticated Users
GRANT SELECT, INSERT ON TABLE public.finix_identities TO authenticated;
GRANT SELECT, INSERT ON TABLE public.finix_identities TO service_role;

-- 3. Policy: Allow Insert (User can create their own payment identity)
DROP POLICY IF EXISTS "Users can insert own finix identity" ON public.finix_identities;

CREATE POLICY "Users can insert own finix identity"
ON public.finix_identities
FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = user_id );

-- 4. Policy: Allow Select (User can see their own payment setup)
DROP POLICY IF EXISTS "Users can view own finix identity" ON public.finix_identities;

CREATE POLICY "Users can view own finix identity"
ON public.finix_identities
FOR SELECT
TO authenticated
USING ( auth.uid() = user_id );

-- 5. Policy: Service Role (Admins/System can do anything)
DROP POLICY IF EXISTS "Service role full access finix_identities" ON public.finix_identities;

CREATE POLICY "Service role full access finix_identities"
ON public.finix_identities
FOR ALL
TO service_role
USING ( true )
WITH CHECK ( true );
