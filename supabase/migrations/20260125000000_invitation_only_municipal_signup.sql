-- =====================================================
-- INVITATION-ONLY MUNICIPAL SIGNUP
-- Adds customer_id to invitations + RPCs for SuperAdmin
-- =====================================================

-- 1. Add customer_id column to organization_invitations
ALTER TABLE public.organization_invitations 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(customer_id);

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_organization_invitations_customer_id 
ON public.organization_invitations(customer_id);

-- =====================================================
-- VALIDATE MUNICIPAL INVITATION (Public - no auth)
-- Used by signup page to validate token before signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_municipal_invitation(p_token TEXT)
RETURNS TABLE(
  invitation_id UUID,
  customer_id UUID,
  customer_name TEXT,
  invitation_email TEXT,
  role TEXT,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_customer RECORD;
BEGIN
  -- Find invitation by token
  SELECT * INTO v_invitation
  FROM public.organization_invitations
  WHERE invitation_token = p_token
  LIMIT 1;

  -- Check if token exists
  IF v_invitation.id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
      FALSE, 'Invalid invitation token'::TEXT;
    RETURN;
  END IF;

  -- Check if already accepted
  IF v_invitation.status = 'accepted' THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
      FALSE, 'This invitation has already been used'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
      FALSE, 'This invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Check if revoked
  IF v_invitation.status = 'revoked' THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
      FALSE, 'This invitation has been revoked'::TEXT;
    RETURN;
  END IF;

  -- Check if municipal type
  IF v_invitation.organization_type != 'municipal' THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
      FALSE, 'Invalid invitation type'::TEXT;
    RETURN;
  END IF;

  -- Get customer name
  SELECT legal_entity_name INTO v_customer
  FROM public.customers
  WHERE customers.customer_id = v_invitation.customer_id;

  -- Return valid invitation data
  RETURN QUERY SELECT 
    v_invitation.id,
    v_invitation.customer_id,
    COALESCE(v_customer.legal_entity_name, 'Unknown Municipality')::TEXT,
    v_invitation.invitation_email,
    v_invitation.role,
    TRUE,
    NULL::TEXT;
END;
$$;

-- =====================================================
-- CREATE SUPERADMIN MUNICIPAL INVITATION
-- SuperAdmins use this to invite municipal users
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_superadmin_municipal_invitation(
  p_customer_id UUID,
  p_invitation_email TEXT,
  p_role TEXT  -- 'admin' or 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id UUID;
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
    gen_random_uuid()::TEXT,
    now() + INTERVAL '7 days',
    'pending'
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- =====================================================
-- ACCEPT MUNICIPAL INVITATION
-- Called after user signs up to finalize their account
-- =====================================================
CREATE OR REPLACE FUNCTION public.accept_municipal_invitation(
  p_invitation_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_user_email TEXT;
  v_account_type TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM public.organization_invitations
  WHERE invitation_token = p_invitation_token
  AND organization_type = 'municipal'
  AND status = 'pending'
  AND (expires_at IS NULL OR expires_at > now());

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- SECURITY: Verify email matches exactly
  IF LOWER(TRIM(v_user_email)) != LOWER(TRIM(v_invitation.invitation_email)) THEN
    RAISE EXCEPTION 'Email does not match invitation';
  END IF;

  -- Determine account_type from role
  v_account_type := CASE v_invitation.role
    WHEN 'admin' THEN 'municipaladmin'
    WHEN 'user' THEN 'municipaluser'
    ELSE 'municipaluser'
  END;

  -- Update profile with customer_id and account_type
  UPDATE public.profiles
  SET 
    customer_id = v_invitation.customer_id,
    account_type = v_account_type,
    updated_at = now()
  WHERE id = p_user_id;

  -- Add to municipal_team_members
  INSERT INTO public.municipal_team_members (
    admin_id,
    customer_id,
    member_id,
    role,
    status,
    invited_at,
    created_at
  )
  VALUES (
    v_invitation.organization_admin_id,
    v_invitation.customer_id,
    p_user_id,
    v_invitation.role,
    'active',
    v_invitation.invited_at,
    now()
  )
  ON CONFLICT (customer_id, member_id) DO UPDATE SET
    status = 'active',
    role = v_invitation.role,
    updated_at = now();

  -- Mark invitation as accepted
  UPDATE public.organization_invitations
  SET 
    status = 'accepted',
    activated_at = now()
  WHERE id = v_invitation.id;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- GET CUSTOMER INVITATIONS (for SuperAdmin Team tab)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_customer_invitations(p_customer_id UUID)
RETURNS TABLE(
  id UUID,
  invitation_email TEXT,
  role TEXT,
  status TEXT,
  invited_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_profile RECORD;
BEGIN
  -- Verify caller is superadmin
  SELECT * INTO v_caller_profile
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF v_caller_profile.account_type != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied: Only SuperAdmins can view invitations';
  END IF;

  RETURN QUERY
  SELECT 
    oi.id,
    oi.invitation_email,
    oi.role,
    oi.status,
    oi.invited_at,
    oi.expires_at
  FROM public.organization_invitations oi
  WHERE oi.customer_id = p_customer_id
  AND oi.organization_type = 'municipal'
  ORDER BY oi.invited_at DESC;
END;
$$;

-- =====================================================
-- GET CUSTOMER TEAM MEMBERS (for SuperAdmin Team tab)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_customer_team_members(p_customer_id UUID)
RETURNS TABLE(
  id UUID,
  member_id UUID,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  account_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_profile RECORD;
BEGIN
  -- Verify caller is superadmin
  SELECT * INTO v_caller_profile
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF v_caller_profile.account_type != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied: Only SuperAdmins can view team members';
  END IF;

  RETURN QUERY
  SELECT 
    mtm.id,
    mtm.member_id,
    mtm.role,
    mtm.status,
    mtm.created_at as joined_at,
    p.first_name,
    p.last_name,
    p.email,
    p.account_type
  FROM public.municipal_team_members mtm
  JOIN public.profiles p ON p.id = mtm.member_id
  WHERE mtm.customer_id = p_customer_id
  ORDER BY mtm.created_at DESC;
END;
$$;
