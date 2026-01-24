-- SAFETY NET TRIGGER (THE "UNBLOCKER")
-- This version wraps the entire logic in a Try/Catch block.
-- If the profile creation fails for ANY reason (constraints, nulls, typos),
-- it catches the error, prints it to the logs, and ALLOWS the auth user to be created.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We wrap everything in a block to catch errors
  BEGIN
      -- 1. SAFETY VALVE: SMS Skeleton Check
      IF (TG_OP = 'INSERT' AND (NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data = '{}'::jsonb)) THEN
         -- Just return, don't try to create profile
         RETURN NEW; 
      END IF;

      -- 2. TRY TO CREATE PROFILE
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
        account_type = COALESCE(NEW.raw_user_meta_data->>'account_type', public.profiles.account_type),
        updated_at = now();
        
  EXCEPTION WHEN OTHERS THEN
      -- IF ANYTHING FAILS: Swallow the error and let the user in.
      -- We will log it so you can see it in "Postgres Logs" later, but the User won't see 500.
      RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
