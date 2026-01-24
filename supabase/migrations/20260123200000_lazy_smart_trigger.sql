-- LAZY SMART TRIGGER (CRASH PROOF)
-- Strategy:
-- 1. IF 'INSERT' (New User) AND Data is missing (SMS) -> DO NOTHING. Just let auth.users exist.
-- 2. IF 'UPDATE' (Form Filled) -> CREATE/UPDATE the Profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. SAFETY VALVE: If this is a raw SMS insert (no metadata), 
  -- DO NOT try to create a profile yet. Wait for the user to fill the form.
  IF (TG_OP = 'INSERT' AND (NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}'::jsonb)) THEN
     RETURN NEW; -- Exit immediately. No profile created.
  END IF;

  -- 2. LAZY CREATION / SYNC: Runs on UPDATE (Form Submit) or Rich INSERT (Email Signup)
  -- This handles creating the row if it doesn't exist (because we skipped it above).
  INSERT INTO public.profiles (
    id, email, first_name, last_name, phone, street_address, 
    city, state, zip_code, account_type, role, 
    business_legal_name, industry, updated_at
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', null),
    COALESCE(NEW.raw_user_meta_data->>'street_address', null),
    COALESCE(NEW.raw_user_meta_data->>'city', null),
    COALESCE(NEW.raw_user_meta_data->>'state', null),
    COALESCE(NEW.raw_user_meta_data->>'zip_code', null),
    -- Fallback to 'resident' if somehow null, but usually provided in update
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'resident'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'user') THEN NEW.raw_user_meta_data->>'role'
      ELSE 'user'
    END,
    COALESCE(NEW.raw_user_meta_data->>'business_legal_name', null),
    COALESCE(NEW.raw_user_meta_data->>'industry', null),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', public.profiles.first_name),
    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', public.profiles.last_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', public.profiles.phone),
    street_address = COALESCE(NEW.raw_user_meta_data->>'street_address', public.profiles.street_address),
    city = COALESCE(NEW.raw_user_meta_data->>'city', public.profiles.city),
    state = COALESCE(NEW.raw_user_meta_data->>'state', public.profiles.state),
    zip_code = COALESCE(NEW.raw_user_meta_data->>'zip_code', public.profiles.zip_code),
    account_type = COALESCE(NEW.raw_user_meta_data->>'account_type', public.profiles.account_type),
    updated_at = now();

  RETURN NEW;
END;
$$;
