-- Create function to get municipal team members for a customer
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
    WHERE id = auth.uid() 
    AND account_type = 'municipal' 
    AND customer_id = p_customer_id
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

-- Create function to create municipal team invitation
CREATE OR REPLACE FUNCTION public.create_municipal_team_invitation(
  p_customer_id uuid,
  p_invitation_email text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_id UUID;
BEGIN
  -- Verify the current user is a municipal admin for this customer
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal' 
    AND customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Not a municipal admin for this customer';
  END IF;
  
  -- Create invitation record
  INSERT INTO public.organization_invitations (
    organization_admin_id,
    invitation_email,
    role,
    organization_type,
    invitation_token,
    expires_at
  )
  VALUES (
    auth.uid(),
    p_invitation_email,
    p_role,
    'municipal',
    gen_random_uuid()::TEXT,
    now() + INTERVAL '7 days'
  )
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$;

-- Create function to remove municipal team member
CREATE OR REPLACE FUNCTION public.remove_municipal_team_member(
  p_customer_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the current user is a municipal admin for this customer
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal' 
    AND customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Not a municipal admin for this customer';
  END IF;
  
  -- Update member status to inactive
  UPDATE public.municipal_team_members
  SET status = 'inactive', updated_at = now()
  WHERE customer_id = p_customer_id 
    AND member_id = p_member_id
    AND status = 'active';
  
  RETURN TRUE;
END;
$$;

-- Create function to update municipal team member role
CREATE OR REPLACE FUNCTION public.update_municipal_team_member_role(
  p_customer_id uuid,
  p_member_id uuid,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the current user is a municipal admin for this customer
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal' 
    AND customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Not a municipal admin for this customer';
  END IF;
  
  -- Update member role
  UPDATE public.municipal_team_members
  SET role = p_new_role, updated_at = now()
  WHERE customer_id = p_customer_id 
    AND member_id = p_member_id
    AND status = 'active';
  
  RETURN TRUE;
END;
$$;