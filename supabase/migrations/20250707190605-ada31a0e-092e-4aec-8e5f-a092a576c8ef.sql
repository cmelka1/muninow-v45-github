-- Comprehensive Business Role Cleanup: Remove businessManager and businessOwner
-- Step 1: Drop all manager-related policies first

-- Drop existing manager-related policies that depend on parent_manager_id
DROP POLICY IF EXISTS "Business managers can insert users" ON public.business_members;
DROP POLICY IF EXISTS "Business managers can update their users" ON public.business_members;
DROP POLICY IF EXISTS "Business managers can view their managed users" ON public.business_members;

-- Step 2: Drop the parent_manager_id column
ALTER TABLE public.business_members DROP COLUMN IF EXISTS parent_manager_id;

-- Step 3: Update any existing businessManager users to businessAdmin
UPDATE public.user_roles 
SET role_id = (SELECT id FROM public.roles WHERE name = 'businessAdmin')
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'businessManager');

-- Step 4: Delete businessManager and businessOwner roles from roles table
DELETE FROM public.roles WHERE name IN ('businessManager', 'businessOwner');

-- Step 5: Drop unused database functions
DROP FUNCTION IF EXISTS public.is_business_manager(uuid);
DROP FUNCTION IF EXISTS public.is_manager_of_user(uuid, uuid);

-- Step 6: Update app_role enum to only include the simplified business roles
-- First create new enum without businessManager and businessOwner
CREATE TYPE public.app_role_new AS ENUM (
  'superAdmin',
  'municipalAdmin', 
  'municipalUser',
  'residentAdmin',
  'residentUser',
  'businessAdmin',
  'businessUser'
);

-- Drop the old enum and rename the new one
DROP TYPE IF EXISTS public.app_role CASCADE;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 7: Create simplified policies for the 2-tier system (Admin → User)
CREATE POLICY "Business admins can manage all members" 
ON public.business_members 
FOR ALL 
USING (is_business_admin(business_id));

CREATE POLICY "Members can view own record" 
ON public.business_members 
FOR SELECT 
USING (auth.uid() = member_id);

CREATE POLICY "Members can update own record" 
ON public.business_members 
FOR UPDATE 
USING (auth.uid() = member_id);