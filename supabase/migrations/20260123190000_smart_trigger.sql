-- SMART TRIGGER MIGRATION
-- Replaces the old 'insert-only' logic with a full 'sync' logic.
-- PROMISE: Any change to auth.users (metadata) is instantly mirrored to public.profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Handling INSERT (New User)
  -- 2. Handling UPDATE (User completing signup / editing profile)
  
  -- Use UPSERT to handle both cases efficiently using the same logic
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
    -- Prioritize Metadata, Fallback to 'Unknown' only on totally new records
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', null),
    COALESCE(NEW.raw_user_meta_data->>'street_address', null),
    COALESCE(NEW.raw_user_meta_data->>'apt_number', null),
    COALESCE(NEW.raw_user_meta_data->>'city', null),
    COALESCE(NEW.raw_user_meta_data->>'state', null),
    COALESCE(NEW.raw_user_meta_data->>'zip_code', null),
    -- The Critical Routing Field:
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'resident'),
    -- Role Logic (Mirror of account_type logic or explicit role)
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

-- Ensure Trigger runs on UPDATE too
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Re-create to fire on INSERT AND UPDATE
CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
