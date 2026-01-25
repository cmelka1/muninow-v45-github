-- SuperAdmin ability to remove municipal team members
-- Also includes function to revoke pending invitations, and updated get_customer_invitations

-- Remove a team member (deactivate, not delete)
CREATE OR REPLACE FUNCTION public.remove_municipal_team_member(
  p_customer_id UUID,
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_profile RECORD;
BEGIN
  -- Verify caller is superadmin
  SELECT * INTO v_caller_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_profile.account_type != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied: Only SuperAdmins can remove team members';
  END IF;

  -- Update team member status to inactive
  UPDATE public.municipal_team_members
  SET status = 'inactive', updated_at = now()
  WHERE customer_id = p_customer_id AND member_id = p_member_id;

  -- Also update the profile to remove customer_id association
  UPDATE public.profiles
  SET customer_id = NULL, updated_at = now()
  WHERE id = p_member_id AND customer_id = p_customer_id;

  RETURN TRUE;
END;
$$;

-- Revoke a pending invitation
CREATE OR REPLACE FUNCTION public.revoke_municipal_invitation(
  p_invitation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_profile RECORD;
BEGIN
  -- Verify caller is superadmin
  SELECT * INTO v_caller_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_profile.account_type != 'superadmin' THEN
    RAISE EXCEPTION 'Access denied: Only SuperAdmins can revoke invitations';
  END IF;

  -- Update invitation status to revoked
  UPDATE public.organization_invitations
  SET status = 'revoked'
  WHERE id = p_invitation_id AND status = 'pending';

  RETURN TRUE;
END;
$$;

-- Update get_customer_invitations to include activated_at
CREATE OR REPLACE FUNCTION public.get_customer_invitations(p_customer_id UUID)
RETURNS TABLE(
  id UUID,
  invitation_email TEXT,
  role TEXT,
  status TEXT,
  invited_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
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
    oi.expires_at,
    oi.activated_at
  FROM public.organization_invitations oi
  WHERE oi.customer_id = p_customer_id
  AND oi.organization_type = 'municipal'
  ORDER BY oi.invited_at DESC;
END;
$$;

