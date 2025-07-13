-- Fix ambiguous column reference in get_municipal_team_members function
CREATE OR REPLACE FUNCTION public.get_municipal_team_members(p_customer_id uuid)
RETURNS TABLE(
  id uuid,
  member_id uuid,
  role text,
  joined_at timestamp with time zone,
  first_name text,
  last_name text,
  email text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the current user is a municipal admin for this customer
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Not a municipal admin for this customer';
  END IF;

  RETURN QUERY
  SELECT 
    mtm.id,
    mtm.member_id,
    mtm.role,
    mtm.created_at as joined_at,
    p.first_name,
    p.last_name,
    p.email,
    p.phone
  FROM public.municipal_team_members mtm
  JOIN public.profiles p ON p.id = mtm.member_id
  WHERE mtm.customer_id = p_customer_id
    AND mtm.status = 'active'
  ORDER BY mtm.created_at DESC;
END;
$$;