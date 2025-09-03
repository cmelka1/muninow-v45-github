-- Enhance user_roles table with user information for better visibility
-- and fix missing superadmin role assignment

-- Add columns to user_roles table for easier viewing and management
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS user_email text,
ADD COLUMN IF NOT EXISTS user_first_name text,
ADD COLUMN IF NOT EXISTS user_last_name text,
ADD COLUMN IF NOT EXISTS role_name text;

-- Create function to sync user data in user_roles table
CREATE OR REPLACE FUNCTION public.sync_user_roles_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update user_roles with current user data
  UPDATE public.user_roles ur
  SET 
    user_email = p.email,
    user_first_name = p.first_name,
    user_last_name = p.last_name,
    role_name = r.name
  FROM public.profiles p, public.roles r
  WHERE ur.user_id = p.id 
    AND ur.role_id = r.id
    AND (ur.user_id = NEW.id OR ur.user_id = OLD.id);
    
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger to automatically sync user data when profiles are updated
DROP TRIGGER IF EXISTS sync_user_roles_on_profile_update ON public.profiles;
CREATE TRIGGER sync_user_roles_on_profile_update
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles_data();

-- Create function to sync role data when roles are updated
CREATE OR REPLACE FUNCTION public.sync_user_roles_role_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update user_roles with current role name
  UPDATE public.user_roles ur
  SET role_name = NEW.name
  WHERE ur.role_id = NEW.id;
    
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically sync role data when roles are updated
DROP TRIGGER IF EXISTS sync_user_roles_on_role_update ON public.roles;
CREATE TRIGGER sync_user_roles_on_role_update
  AFTER UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles_role_data();

-- Populate existing data in user_roles table
UPDATE public.user_roles ur
SET 
  user_email = p.email,
  user_first_name = p.first_name,
  user_last_name = p.last_name,
  role_name = r.name
FROM public.profiles p, public.roles r
WHERE ur.user_id = p.id AND ur.role_id = r.id;

-- Insert missing superadmin role for Charles Melka (cmelka@muninow.com)
INSERT INTO public.user_roles (user_id, role_id, user_email, user_first_name, user_last_name, role_name)
SELECT 
  p.id,
  r.id,
  p.email,
  p.first_name,
  p.last_name,
  r.name
FROM public.profiles p, public.roles r
WHERE p.email = 'cmelka@muninow.com'
  AND r.name = 'superadmin'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

-- Create a helpful view for role management
CREATE OR REPLACE VIEW public.user_roles_detailed AS
SELECT 
  ur.id,
  ur.user_id,
  ur.role_id,
  ur.entity_id,
  ur.user_email,
  ur.user_first_name,
  ur.user_last_name,
  ur.role_name,
  p.account_type,
  p.customer_id,
  r.name as role_name_current,
  ur.created_at
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
LEFT JOIN public.roles r ON r.id = ur.role_id
ORDER BY ur.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.user_roles_detailed TO authenticated;

-- Add RLS policy for the enhanced user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all user roles
DROP POLICY IF EXISTS "Super admins can view all user roles" ON public.user_roles;
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur2
    JOIN public.roles r ON r.id = ur2.role_id
    WHERE ur2.user_id = auth.uid()
    AND r.name = 'superadmin'
  )
);

-- Policy: Users can view their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Super admins can manage all user roles
DROP POLICY IF EXISTS "Super admins can manage all user roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur2
    JOIN public.roles r ON r.id = ur2.role_id
    WHERE ur2.user_id = auth.uid()
    AND r.name = 'superadmin'
  )
);