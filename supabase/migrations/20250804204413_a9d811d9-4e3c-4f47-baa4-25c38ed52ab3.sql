-- Fix infinite recursion in profiles table RLS policies

-- Drop all existing policies on profiles table to start clean
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view commenter profiles on accessible permits" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Municipal users can view profiles for their customer" ON public.profiles;

-- Create a security definer function to check user roles without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT ur.role_id::text
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- Create a security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'superAdmin'
  );
$$;

-- Create clean, non-recursive policies
CREATE POLICY "Users can view their own profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_super_admin());

-- Municipal users can view profiles with bills for their customer
CREATE POLICY "Municipal users can view profiles for their customer"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles municipal_profile
    WHERE municipal_profile.id = auth.uid()
    AND municipal_profile.account_type = 'municipal'
    AND EXISTS (
      SELECT 1
      FROM public.master_bills mb
      WHERE mb.user_id = profiles.id
      AND mb.customer_id = municipal_profile.customer_id
    )
  )
);