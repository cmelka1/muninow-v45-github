-- FIX: Municipal Admin Signup - Missing customer_id + Remove non-existent 'role' column
-- The previous handle_new_user trigger was referencing a 'role' column that doesn't exist,
-- causing profile creation to fail silently.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_type TEXT;
  v_customer_id UUID;
BEGIN
  BEGIN
    IF (TG_OP = 'INSERT' AND (NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}'::jsonb)) THEN
      RETURN NEW; 
    END IF;

    v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'resident');
    
    IF v_account_type IN ('municipal', 'municipaladmin', 'municipaluser') THEN
      BEGIN
        v_customer_id := (NEW.raw_user_meta_data->>'customer_id')::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
      END;
    ELSE
      v_customer_id := NULL;
    END IF;

    INSERT INTO public.profiles (
      id, email, first_name, last_name, phone, street_address, 
      city, state, zip_code, account_type,
      business_legal_name, industry, customer_id, updated_at
    )
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'street_address',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state',
      NEW.raw_user_meta_data->>'zip_code',
      v_account_type,
      NEW.raw_user_meta_data->>'business_legal_name',
      NEW.raw_user_meta_data->>'industry',
      v_customer_id,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', public.profiles.first_name),
      last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', public.profiles.last_name),
      account_type = COALESCE(NEW.raw_user_meta_data->>'account_type', public.profiles.account_type),
      customer_id = COALESCE(v_customer_id, public.profiles.customer_id),
      updated_at = now();
        
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Add municipal admin to team_members if they have a customer_id
-- This is done separately to ensure the profile exists first
CREATE OR REPLACE FUNCTION public.add_municipal_admin_to_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only for municipal admins with a customer_id
  IF NEW.account_type = 'municipaladmin' AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.team_members (
      user_id,
      customer_id,
      role,
      status,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.customer_id,
      'admin',
      'active',
      now()
    )
    ON CONFLICT (user_id, customer_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-adding municipal admins to team_members
DROP TRIGGER IF EXISTS on_profile_created_add_team_member ON public.profiles;
CREATE TRIGGER on_profile_created_add_team_member
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_municipal_admin_to_team();
