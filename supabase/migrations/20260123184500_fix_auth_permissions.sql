-- COMPREHENSIVE AUTH FIX
-- 1. Grant EXECUTE permissions to the new secure function (Critical Missing Step)
-- 2. Ensure RLS policies exist for reading profiles (Critical for Login)

-- A. Grant EXECUTE on the new RPC function
GRANT EXECUTE ON FUNCTION public.update_own_profile_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_own_profile_metadata TO service_role;

-- B. Ensure Profiles Table Permissions
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant basic access to the table
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO service_role;

-- C. Create/Ensure Policy for "View Own Profile"
-- Drop first to avoid "policy already exists" error if re-running
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ( auth.uid() = id );

-- D. Create/Ensure Policy for "Update Own Profile"
-- (Note: Our RPC function bypasses this, but good to have for standard updates)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ( auth.uid() = id );
