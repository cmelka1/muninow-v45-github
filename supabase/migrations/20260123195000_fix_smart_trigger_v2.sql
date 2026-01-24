-- FIXED SMART TRIGGER (FINAL)
-- The previous version crashed because 'first_name' and 'last_name' are NOT NULL,
-- but the SMS Skeleton insert didn't provide them.
-- FIX: We now provide "Unknown" and "Verification" as placeholders.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. GUARD CLAUSE: SMS User (No Metadata yet) -> Create Placeholder Profile
  IF (TG_OP = 'INSERT' AND (NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}'::jsonb)) THEN
     INSERT INTO public.profiles (
       id, 
       email, 
       account_type, 
       role,
       first_name,  -- REQUIRED FIELD
       last_name    -- REQUIRED FIELD
     )
     VALUES (
       NEW.id, 
       NEW.email, 
       'resident', 
       'user',
       'Pending',   -- Placeholder to satisfy NOT NULL
       'User'       -- Placeholder to satisfy NOT NULL
     )
     ON CONFLICT (id) DO NOTHING;
     RETURN NEW;
  END IF;

  -- 2. FULL SYNC LOGIC: Updates or Full Inserts
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
    business_legal_name = COALESCE(NEW.raw_user_meta_data->>'business_legal_name', public.profiles.business_legal_name),
    industry = COALESCE(NEW.raw_user_meta_data->>'industry', public.profiles.industry),
    updated_at = now();

  RETURN NEW;
END;
$$;
