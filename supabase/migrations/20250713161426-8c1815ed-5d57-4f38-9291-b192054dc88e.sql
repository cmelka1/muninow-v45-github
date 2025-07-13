-- Update handle_new_user function to automatically add municipal admins to team members
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
    industry,
    customer_id
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
    COALESCE(NEW.raw_user_meta_data->>'industry', null),
    COALESCE((NEW.raw_user_meta_data->>'customer_id')::uuid, null)
  );

  -- If this is a municipal admin, automatically add them to municipal_team_members
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', 'resident') = 'municipal' 
     AND COALESCE(NEW.raw_user_meta_data->>'role', 'user') = 'admin'
     AND NEW.raw_user_meta_data->>'customer_id' IS NOT NULL THEN
    
    INSERT INTO public.municipal_team_members (
      customer_id,
      admin_id,
      member_id,
      role,
      status
    )
    VALUES (
      (NEW.raw_user_meta_data->>'customer_id')::uuid,
      NEW.id,
      NEW.id,
      'admin',
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill existing municipal admins who aren't in municipal_team_members yet
INSERT INTO public.municipal_team_members (
  customer_id,
  admin_id,
  member_id,
  role,
  status
)
SELECT 
  p.customer_id,
  p.id,
  p.id,
  'admin',
  'active'
FROM public.profiles p
WHERE p.account_type = 'municipal'
  AND p.role = 'admin'
  AND p.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.municipal_team_members mtm 
    WHERE mtm.member_id = p.id AND mtm.customer_id = p.customer_id
  );