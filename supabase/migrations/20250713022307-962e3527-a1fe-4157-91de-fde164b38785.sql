-- Update handle_new_user function to fix empty string constraint violations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the raw_user_meta_data for debugging if needed
  IF NEW.raw_user_meta_data IS NULL THEN
    RAISE LOG 'handle_new_user: raw_user_meta_data is NULL for user %', NEW.id;
  END IF;
  
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
  );
  RETURN NEW;
END;
$$;