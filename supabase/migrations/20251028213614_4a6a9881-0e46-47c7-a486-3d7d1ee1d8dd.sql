-- Fix customer_id architecture: Only municipal users should have customer_id

-- Step 1: Update handle_new_user() to only set customer_id for municipal account types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id uuid;
  v_account_type text;
  v_existing_admin_id uuid;
BEGIN
  -- Extract metadata
  v_customer_id := NULLIF(new.raw_user_meta_data ->> 'customer_id', '')::uuid;
  v_account_type := COALESCE(new.raw_user_meta_data ->> 'account_type', 'residentadmin');

  -- Insert profile - only set customer_id for municipal account types
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
    -- Only set customer_id for municipal staff
    CASE 
      WHEN v_account_type IN ('municipal', 'municipaladmin', 'municipaluser')
      THEN v_customer_id
      ELSE NULL
    END
  );

  -- Handle municipal team member creation (only for municipal account types)
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

-- Step 2: Clean up existing bad data - remove customer_id from resident and business users
UPDATE public.profiles
SET customer_id = NULL
WHERE account_type IN ('residentadmin', 'residentuser', 'businessadmin', 'businessuser')
AND customer_id IS NOT NULL;

-- Step 3: Add CHECK constraint to enforce this rule going forward
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_customer_id_only_municipal;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_customer_id_only_municipal 
CHECK (
  (customer_id IS NULL AND account_type IN ('residentadmin', 'residentuser', 'businessadmin', 'businessuser', 'superadmin'))
  OR 
  (customer_id IS NOT NULL AND account_type IN ('municipal', 'municipaladmin', 'municipaluser'))
  OR
  account_type IS NULL
);