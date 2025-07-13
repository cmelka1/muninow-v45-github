-- First, update any existing profiles with invalid roles to 'user'
UPDATE public.profiles 
SET role = 'user' 
WHERE role NOT IN ('admin', 'user');

-- Drop the existing role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint that only allows 'admin' and 'user' roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user'));