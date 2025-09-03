-- Update roles table to use lowercase role names
UPDATE public.roles 
SET name = CASE 
  WHEN name = 'superAdmin' THEN 'superadmin'
  WHEN name = 'municipalAdmin' THEN 'municipaladmin'
  WHEN name = 'municipalUser' THEN 'municipaluser'
  WHEN name = 'residentAdmin' THEN 'residentadmin'
  WHEN name = 'residentUser' THEN 'residentuser'
  WHEN name = 'businessAdmin' THEN 'businessadmin'
  WHEN name = 'businessUser' THEN 'businessuser'
  ELSE name
END
WHERE name IN ('superAdmin', 'municipalAdmin', 'municipalUser', 'residentAdmin', 'residentUser', 'businessAdmin', 'businessUser');

-- Update app_role enum if it exists and is used
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    -- First create the new enum
    CREATE TYPE public.app_role_new AS ENUM (
      'superadmin',
      'municipaladmin', 
      'municipaluser',
      'residentadmin',
      'residentuser',
      'businessadmin',
      'businessuser'
    );
    
    -- Update any columns that use the old enum (if any exist)
    -- Note: This is a precautionary step in case the enum is used somewhere
    
    -- Replace the old enum with the new one
    ALTER TYPE public.app_role RENAME TO app_role_old;
    ALTER TYPE public.app_role_new RENAME TO app_role;
    DROP TYPE IF EXISTS public.app_role_old;
  END IF;
END $$;