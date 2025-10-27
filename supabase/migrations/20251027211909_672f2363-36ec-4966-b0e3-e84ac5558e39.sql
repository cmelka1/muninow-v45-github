-- Fix municipal admin signup process
-- This migration addresses:
-- 1. NULL admin_id constraint violation in municipal_team_members
-- 2. Missing customer_id in profiles table insertion
-- 3. Legacy 'municipal' account type references
-- 4. RLS policy updates for new account types

-- Phase 1: Fix the handle_new_user() function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_account_type text;
  v_existing_admin_id uuid;
BEGIN
  -- Extract metadata
  v_customer_id := NULLIF(new.raw_user_meta_data ->> 'customer_id', '')::uuid;
  v_account_type := COALESCE(new.raw_user_meta_data ->> 'account_type', '');

  -- Insert profile WITH customer_id
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    email, 
    phone, 
    street_address, 
    apt_number, 
    city, 
    state, 
    zip_code, 
    account_type, 
    business_legal_name, 
    industry,
    customer_id
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    new.email, 
    new.raw_user_meta_data ->> 'phone', 
    new.raw_user_meta_data ->> 'street_address', 
    new.raw_user_meta_data ->> 'apt_number', 
    new.raw_user_meta_data ->> 'city', 
    new.raw_user_meta_data ->> 'state', 
    new.raw_user_meta_data ->> 'zip_code', 
    v_account_type,
    new.raw_user_meta_data ->> 'business_legal_name', 
    new.raw_user_meta_data ->> 'industry',
    v_customer_id
  );

  -- Handle municipal team member creation
  IF v_customer_id IS NOT NULL AND v_account_type IN ('municipaladmin', 'municipal', 'municipaluser') THEN
    
    -- For municipaladmin or legacy 'municipal' - they are their own admin
    IF v_account_type IN ('municipaladmin', 'municipal') THEN
      INSERT INTO public.municipal_team_members (
        customer_id,
        admin_id,
        member_id,
        role,
        status
      )
      VALUES (
        v_customer_id,
        new.id,
        new.id,
        'admin',
        'active'
      )
      ON CONFLICT (customer_id, member_id) DO NOTHING;
      
    -- For municipaluser - find the existing admin
    ELSIF v_account_type = 'municipaluser' THEN
      -- Find existing municipaladmin for this customer
      SELECT id INTO v_existing_admin_id
      FROM public.profiles
      WHERE customer_id = v_customer_id 
        AND account_type = 'municipaladmin'
      LIMIT 1;
      
      IF v_existing_admin_id IS NOT NULL THEN
        INSERT INTO public.municipal_team_members (
          customer_id,
          admin_id,
          member_id,
          role,
          status
        )
        VALUES (
          v_customer_id,
          v_existing_admin_id,
          new.id,
          'user',
          'active'
        )
        ON CONFLICT (customer_id, member_id) DO NOTHING;
      ELSE
        RAISE WARNING 'No municipaladmin found for customer_id %, skipping team member creation for user %', 
          v_customer_id, new.id;
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- Phase 2: Update legacy account type references

-- Drop old index that checks for 'municipal'
DROP INDEX IF EXISTS unique_municipal_customer_admin;

-- Create new index that checks for 'municipaladmin'
CREATE UNIQUE INDEX unique_municipal_customer_admin 
ON public.profiles (customer_id) 
WHERE account_type = 'municipaladmin';

-- Update the check function
CREATE OR REPLACE FUNCTION public.check_customer_admin_exists(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE customer_id = p_customer_id 
    AND account_type = 'municipaladmin'
  );
END;
$$;

-- Phase 3: Update RLS policies

-- Update municipal_team_members policies
DROP POLICY IF EXISTS "Municipal admins can manage team members" ON public.municipal_team_members;
CREATE POLICY "Municipal admins can manage team members" 
ON public.municipal_team_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type IN ('municipaladmin', 'municipaluser')
    AND customer_id = municipal_team_members.customer_id
  )
);

DROP POLICY IF EXISTS "Municipal members can view their team" ON public.municipal_team_members;
CREATE POLICY "Municipal members can view their team" 
ON public.municipal_team_members 
FOR SELECT 
USING (
  member_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type IN ('municipaladmin', 'municipaluser')
    AND customer_id = municipal_team_members.customer_id
  )
);