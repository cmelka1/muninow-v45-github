-- Secure function to allow users to update their own profile metadata during signup completion
-- This bypasses RLS restrictions on specific fields like 'account_type' or 'role' which might be protected.

CREATE OR REPLACE FUNCTION public.update_own_profile_metadata(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_street_address text,
  p_city text,
  p_state text,
  p_zip_code text,
  p_account_type text,
  p_business_legal_name text default null,
  p_industry text default null
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public -- Security best practice
AS $$
DECLARE
  v_user_id uuid;
  v_updated_profile public.profiles;
BEGIN
  -- Get the ID of the currently authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the profile
  UPDATE public.profiles
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    phone = COALESCE(p_phone, phone), -- Keep existing if null passed
    street_address = p_street_address,
    city = p_city,
    state = p_state,
    zip_code = p_zip_code,
    account_type = p_account_type, -- The critical field
    business_legal_name = p_business_legal_name,
    industry = p_industry,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING * INTO v_updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN json_build_object(
    'success', true,
    'profile', row_to_json(v_updated_profile)
  );
END;
$$;
