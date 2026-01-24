-- FIXED SMART TRIGGER
-- 1. Handles "Skeleton Users" (SMS) by inserting a minimal profile first.
-- 2. Handles "Full Users" (Update) by syncing all metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- GUARD CLAUSE: If this is an INSERT (New User) but has no metadata (SMS Skeleton),
  -- just create a basic placeholder profile and exit to avoid crashing.
  IF (TG_OP = 'INSERT' AND (NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}'::jsonb)) THEN
     INSERT INTO public.profiles (id, email, account_type, role)
     VALUES (NEW.id, NEW.email, 'resident', 'user')
     ON CONFLICT (id) DO NOTHING;
     RETURN NEW;
  END IF;

  -- FULL SYNC LOGIC (Runs on UPDATE or Full INSERT)
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name,
    phone,
    street_address,
    apt_number,
    city,
    state,
    zip_code,
    account_type,
    role,
    business_legal_name,
    industry,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', null),
    COALESCE(NEW.raw_user_meta_data->>'street_address', null),
    COALESCE(NEW.raw_user_meta_data->>'apt_number', null),
    COALESCE(NEW.raw_user_meta_data->>'city', null),
    COALESCE(NEW.raw_user_meta_data->>'state', null),
    COALESCE(NEW.raw_user_meta_data->>'zip_code', null),
    -- Sync Account Type
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'resident'),
    -- Sync Role
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
    apt_number = COALESCE(NEW.raw_user_meta_data->>'apt_number', public.profiles.apt_number),
    city = COALESCE(NEW.raw_user_meta_data->>'city', public.profiles.city),
    state = COALESCE(NEW.raw_user_meta_data->>'state', public.profiles.state),
    zip_code = COALESCE(NEW.raw_user_meta_data->>'zip_code', public.profiles.zip_code),
    account_type = COALESCE(NEW.raw_user_meta_data->>'account_type', public.profiles.account_type),
    business_legal_name = COALESCE(NEW.raw_user_meta_data->>'business_legal_name', public.profiles.business_legal_name),
    industry = COALESCE(NEW.raw_user_meta_data->>'industry', public.profiles.industry),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- PROMISE: We re-enable the trigger now that it is crash-proof.
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;

CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
