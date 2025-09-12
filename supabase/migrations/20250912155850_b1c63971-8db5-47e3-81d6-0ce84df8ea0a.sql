-- Fix permit comments RLS policies - drop all first
DROP POLICY IF EXISTS "Applicants can add comments to their own permits" ON permit_review_comments;
DROP POLICY IF EXISTS "Municipal users can manage comments for their customer permits" ON permit_review_comments;
DROP POLICY IF EXISTS "Municipal users can create comments for their customer permits" ON permit_review_comments;
DROP POLICY IF EXISTS "Users can create comments for their own permit applications" ON permit_review_comments;
DROP POLICY IF EXISTS "Super admins can create any permit comments" ON permit_review_comments;

-- Create correct RLS policies for permit comments
CREATE POLICY "Users can create comments for their own permit applications"
ON permit_review_comments
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM permit_applications pa
    WHERE pa.permit_id = permit_review_comments.permit_id
    AND pa.user_id = auth.uid()
  )
);

CREATE POLICY "Municipal users can create comments for their customer permits"
ON permit_review_comments
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM permit_applications pa
    JOIN profiles p ON p.id = auth.uid()
    WHERE pa.permit_id = permit_review_comments.permit_id
    AND pa.customer_id = p.customer_id
    AND p.account_type IN ('municipaladmin', 'municipaluser')
  )
);

CREATE POLICY "Super admins can create any permit comments"
ON permit_review_comments
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid()
  AND is_current_user_super_admin()
);

-- Update the profile function to use modern account types
CREATE OR REPLACE FUNCTION public.can_view_profile_for_permits(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Allow users to view their own profile
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Allow super admins to view all profiles
  IF is_current_user_super_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Allow municipal users to view profiles of users who have permits in their jurisdiction
  IF EXISTS (
    SELECT 1 FROM profiles current_user_profile
    WHERE current_user_profile.id = auth.uid()
    AND current_user_profile.account_type IN ('municipaladmin', 'municipaluser')
    AND EXISTS (
      SELECT 1 FROM permit_applications pa
      WHERE pa.user_id = target_user_id
      AND pa.customer_id = current_user_profile.customer_id
    )
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Allow users to view municipal staff profiles who have interacted with their permits
  IF EXISTS (
    SELECT 1 FROM permit_applications pa
    WHERE pa.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles municipal_profile
      WHERE municipal_profile.id = target_user_id
      AND municipal_profile.account_type IN ('municipaladmin', 'municipaluser')
      AND municipal_profile.customer_id = pa.customer_id
    )
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Allow users to view profiles of reviewers/inspectors on their permits
  IF EXISTS (
    SELECT 1 FROM permit_applications pa
    WHERE pa.user_id = auth.uid()
    AND pa.assigned_reviewer_id = target_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Allow reviewers to view applicant profiles for permits they're assigned to
  IF EXISTS (
    SELECT 1 FROM permit_applications pa
    WHERE pa.assigned_reviewer_id = auth.uid()
    AND pa.user_id = target_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;