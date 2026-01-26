-- =====================================================
-- Fix legacy role functions to use profiles.account_type
-- Removes all references to dropped user_roles table
-- =====================================================

-- DROP legacy functions that are no longer needed
DROP FUNCTION IF EXISTS public.assign_role_to_user(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.remove_role_from_user(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_role_id_by_name(text);
DROP FUNCTION IF EXISTS public.handle_profile_role_assignment() CASCADE;

-- Drop ALL versions of has_role and has_permission
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
DROP FUNCTION IF EXISTS public.has_role(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.has_role(text);
DROP FUNCTION IF EXISTS public.has_permission(text);
DROP FUNCTION IF EXISTS public.has_permission(uuid, text, uuid);

-- REPLACE get_current_user_role to use profiles.account_type
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT account_type FROM public.profiles WHERE id = auth.uid();
$$;

-- REPLACE has_role to use profiles.account_type
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id 
    AND account_type = _role
  );
$$;

-- REPLACE has_permission (simple version using account_type)
CREATE OR REPLACE FUNCTION public.has_permission(_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- SuperAdmins have all permissions
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'superadmin'
  );
$$;

-- REPLACE is_current_user_super_admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'superadmin'
  );
$$;
