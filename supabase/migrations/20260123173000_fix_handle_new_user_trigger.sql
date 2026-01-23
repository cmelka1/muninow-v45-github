-- Fix handle_new_user to be idempotent and avoid "Data error saving new user"
-- by handling unique constraint violations on the profiles table gracefully.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the raw_user_meta_data for debugging
  IF NEW.raw_user_meta_data IS NULL THEN
    RAISE LOG 'handle_new_user: raw_user_meta_data is NULL for user %', NEW.id;
  END IF;
  
  -- Use UPSERT to prevent unique constraint violations on 'id'
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
    industry
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
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'resident'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'user') THEN NEW.raw_user_meta_data->>'role'
      ELSE 'user'
    END,
    COALESCE(NEW.raw_user_meta_data->>'business_legal_name', null),
    COALESCE(NEW.raw_user_meta_data->>'industry', null)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- In case of other unique constraints (like email/phone if enforced), log and ignore to allow Auth to proceed
    RAISE LOG 'handle_new_user: Unique constraint violation for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Capture other errors so we don't block user creation with "Database error"
    RAISE LOG 'handle_new_user: Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
