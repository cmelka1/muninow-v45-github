-- Update can_view_profile_for_permits to allow applicants to view reviewer profiles
-- This allows users to see names and info of municipal staff who comment on their applications

CREATE OR REPLACE FUNCTION public.can_view_profile_for_permits(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_customer_id uuid;
  target_user_customer_id uuid;
BEGIN
  -- Allow users to view their own profile
  IF auth.uid() = target_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Allow super admins to view all profiles
  IF is_current_user_super_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Get current user's customer_id if they're municipal
  SELECT customer_id INTO current_user_customer_id
  FROM profiles
  WHERE id = auth.uid()
    AND account_type IN ('municipaladmin', 'municipaluser', 'municipal');
  
  -- CASE 1: Municipal users viewing applicant profiles
  IF current_user_customer_id IS NOT NULL THEN
    -- Check if target user has any applications in this municipality
    IF EXISTS (
      SELECT 1 FROM permit_applications
      WHERE user_id = target_user_id
        AND customer_id = current_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM business_license_applications
      WHERE user_id = target_user_id
        AND customer_id = current_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM tax_submissions
      WHERE user_id = target_user_id
        AND customer_id = current_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM municipal_service_applications
      WHERE user_id = target_user_id
        AND customer_id = current_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- CASE 2: Applicants viewing municipal reviewer profiles
  -- Check if target user is a reviewer on any of current user's applications
  
  -- Get target user's customer_id to verify they're municipal
  SELECT customer_id INTO target_user_customer_id
  FROM profiles
  WHERE id = target_user_id
    AND account_type IN ('municipaladmin', 'municipaluser', 'municipal');
  
  -- Only proceed if target is a municipal user
  IF target_user_customer_id IS NOT NULL THEN
    -- Check if target user has commented on current user's permits
    IF EXISTS (
      SELECT 1 FROM permit_review_comments prc
      JOIN permit_applications pa ON pa.id = prc.permit_id
      WHERE prc.reviewer_id = target_user_id
        AND pa.user_id = auth.uid()
        AND pa.customer_id = target_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    -- Check if target user has commented on current user's business licenses
    IF EXISTS (
      SELECT 1 FROM business_license_comments blc
      JOIN business_license_applications bla ON bla.id = blc.license_id
      WHERE blc.reviewer_id = target_user_id
        AND bla.user_id = auth.uid()
        AND bla.customer_id = target_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    -- Check if target user has commented on current user's tax submissions
    IF EXISTS (
      SELECT 1 FROM tax_submission_comments tsc
      JOIN tax_submissions ts ON ts.id = tsc.submission_id
      WHERE tsc.reviewer_id = target_user_id
        AND ts.user_id = auth.uid()
        AND ts.customer_id = target_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
    
    -- Check if target user has commented on current user's service applications
    IF EXISTS (
      SELECT 1 FROM municipal_service_application_comments msac
      JOIN municipal_service_applications msa ON msa.id = msac.application_id
      WHERE msac.reviewer_id = target_user_id
        AND msa.user_id = auth.uid()
        AND msa.customer_id = target_user_customer_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- If no valid relationship found, deny access
  RETURN FALSE;
END;
$$;