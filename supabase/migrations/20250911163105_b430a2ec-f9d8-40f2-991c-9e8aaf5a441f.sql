-- Fix security issues from the cleanup migration

-- Fix the new functions to have proper search_path
CREATE OR REPLACE FUNCTION public.handle_profile_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  role_name text;
BEGIN
  -- Map specific account types to role names
  CASE NEW.account_type
    WHEN 'superadmin' THEN
      role_name := 'superadmin';
    WHEN 'municipaladmin' THEN
      role_name := 'municipaladmin';
    WHEN 'municipaluser' THEN
      role_name := 'municipaluser';
    WHEN 'residentadmin' THEN
      role_name := 'residentadmin';
    WHEN 'residentuser' THEN
      role_name := 'residentuser';
    WHEN 'businessadmin' THEN
      role_name := 'businessadmin';
    WHEN 'businessuser' THEN
      role_name := 'businessuser';
    ELSE
      -- For any unrecognized account type, default to residentuser
      role_name := 'residentuser';
  END CASE;
  
  -- Remove any existing roles for this user to prevent conflicts
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  
  -- Insert the new role if it exists
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.id, r.id
  FROM public.roles r
  WHERE r.name = role_name
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_account_type_role_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Ensure account_type is one of the allowed values
  IF NEW.account_type NOT IN (
    'superadmin', 'municipaladmin', 'municipaluser', 
    'residentadmin', 'residentuser', 'businessadmin', 'businessuser'
  ) THEN
    RAISE EXCEPTION 'Invalid account_type: %. Allowed values are: superadmin, municipaladmin, municipaluser, residentadmin, residentuser, businessadmin, businessuser', NEW.account_type;
  END IF;
  
  RETURN NEW;
END;
$function$;