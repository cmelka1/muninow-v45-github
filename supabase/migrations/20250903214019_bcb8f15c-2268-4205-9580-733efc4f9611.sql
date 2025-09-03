-- First, update the check constraint to allow lowercase values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;

-- Add new constraint that allows both camelCase and lowercase values during transition
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check 
CHECK (account_type IN ('resident', 'municipal', 'superAdmin', 'municipalAdmin', 'municipalUser', 'residentAdmin', 'residentUser', 'businessAdmin', 'businessUser', 'superadmin', 'municipaladmin', 'municipaluser', 'residentadmin', 'residentuser', 'businessadmin', 'businessuser'));

-- Now normalize the data
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

UPDATE public.profiles 
SET account_type = CASE 
  WHEN account_type = 'superAdmin' THEN 'superadmin'
  WHEN account_type = 'municipalAdmin' THEN 'municipaladmin'
  WHEN account_type = 'municipalUser' THEN 'municipaluser'
  WHEN account_type = 'residentAdmin' THEN 'residentadmin'
  WHEN account_type = 'residentUser' THEN 'residentuser'
  WHEN account_type = 'businessAdmin' THEN 'businessadmin'
  WHEN account_type = 'businessUser' THEN 'businessuser'
  ELSE account_type
END
WHERE account_type IN ('superAdmin', 'municipalAdmin', 'municipalUser', 'residentAdmin', 'residentUser', 'businessAdmin', 'businessUser');

-- Finally, update constraint to only allow lowercase values
ALTER TABLE public.profiles DROP CONSTRAINT profiles_account_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check 
CHECK (account_type IN ('resident', 'municipal', 'superadmin', 'municipaladmin', 'municipaluser', 'residentadmin', 'residentuser', 'businessadmin', 'businessuser'));