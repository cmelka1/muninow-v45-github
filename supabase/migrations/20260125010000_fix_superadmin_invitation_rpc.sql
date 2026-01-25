-- FIX: SuperAdmin can't read invitation after creating it due to RLS
-- Solution: Make the RPC return BOTH the invitation_id AND the token

-- Drop and recreate the RPC to return full invitation details
CREATE OR REPLACE FUNCTION public.create_superadmin_municipal_invitation(
  p_customer_id UUID,
  p_invitation_email TEXT,
  p_role TEXT
)
RETURNS TABLE(invitation_id UUID, invitation_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id UUID;
  v_invitation_token TEXT;
  v_caller_profile RECORD;
BEGIN
  -- Verify caller is a superadmin
  SELECT * INTO v_caller_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_profile.account_type != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied: Only SuperAdmins can create municipal invitations';
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or user';
  END IF;

  -- Validate customer exists
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE customer_id = p_customer_id) THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  -- Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM public.organization_invitations
    WHERE invitation_email = p_invitation_email
    AND customer_id = p_customer_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;

  -- Generate token
  v_invitation_token := gen_random_uuid()::TEXT;

  -- Create invitation
  INSERT INTO public.organization_invitations (
    organization_admin_id,
    customer_id,
    invitation_email,
    role,
    organization_type,
    invitation_token,
    expires_at,
    status
  )
  VALUES (
    auth.uid(),
    p_customer_id,
    LOWER(TRIM(p_invitation_email)),
    p_role,
    'municipal',
    v_invitation_token,
    now() + INTERVAL '7 days',
    'pending'
  )
  RETURNING id INTO v_invitation_id;

  -- Return both ID and token
  RETURN QUERY SELECT v_invitation_id, v_invitation_token;
END;
$$;
