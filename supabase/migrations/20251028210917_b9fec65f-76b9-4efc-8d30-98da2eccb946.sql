-- Drop the old broken function
DROP FUNCTION IF EXISTS public.get_user_profile_for_municipal(uuid);

-- Create the corrected function that supports all municipal account types
CREATE OR REPLACE FUNCTION public.get_user_profile_for_municipal(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  street_address text,
  apt_number text,
  city text,
  state text,
  zip_code text,
  account_type text,
  business_legal_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  requesting_customer_id uuid;
BEGIN
  -- Get the customer_id of the requesting municipal user (support all municipal account types)
  SELECT profiles.customer_id INTO requesting_customer_id
  FROM public.profiles
  WHERE profiles.id = auth.uid() 
    AND profiles.account_type IN ('municipal', 'municipaladmin', 'municipaluser');
  
  -- If not a municipal user, return no results
  IF requesting_customer_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if the requested user has any applications/submissions for this customer
  IF NOT EXISTS (
    -- Check permits
    SELECT 1 FROM public.permit_applications 
    WHERE user_id = p_user_id AND customer_id = requesting_customer_id
    UNION ALL
    -- Check business licenses
    SELECT 1 FROM public.business_license_applications 
    WHERE user_id = p_user_id AND customer_id = requesting_customer_id
    UNION ALL
    -- Check tax submissions
    SELECT 1 FROM public.tax_submissions 
    WHERE user_id = p_user_id AND customer_id = requesting_customer_id
    UNION ALL
    -- Check service applications
    SELECT 1 FROM public.municipal_service_applications 
    WHERE user_id = p_user_id AND customer_id = requesting_customer_id
    LIMIT 1
  ) THEN
    RETURN;
  END IF;
  
  -- Return the user profile
  RETURN QUERY
  SELECT 
    profiles.id,
    profiles.first_name,
    profiles.last_name,
    profiles.email,
    profiles.phone,
    profiles.street_address,
    profiles.apt_number,
    profiles.city,
    profiles.state,
    profiles.zip_code,
    profiles.account_type,
    profiles.business_legal_name,
    profiles.created_at,
    profiles.updated_at
  FROM public.profiles
  WHERE profiles.id = p_user_id;
END;
$function$;