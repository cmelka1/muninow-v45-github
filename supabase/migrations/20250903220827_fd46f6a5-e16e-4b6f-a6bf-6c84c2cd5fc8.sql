-- Fix infinite recursion in RLS policies by using security definer function
-- The issue is that RLS policies are querying the same table they're applied to

-- Update user_roles RLS policies to use the security definer function
DROP POLICY IF EXISTS "Super admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all user roles" ON public.user_roles;

-- Create new policies using the security definer function
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin());

-- Update customers table RLS policies to use the security definer function
DROP POLICY IF EXISTS "Super admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Super admins can view all customers" ON public.customers;

CREATE POLICY "Super admins can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Super admins can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());

-- Update other tables that have similar recursive policies
DROP POLICY IF EXISTS "Super admins can view all merchants" ON public.merchants;
DROP POLICY IF EXISTS "Super admins can insert merchants" ON public.merchants;
DROP POLICY IF EXISTS "Super admins can update merchants" ON public.merchants;

CREATE POLICY "Super admins can view all merchants"
ON public.merchants
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can insert merchants"
ON public.merchants
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Super admins can update merchants"
ON public.merchants
FOR UPDATE
TO authenticated
USING (public.is_current_user_super_admin());

-- Update master_bills table
DROP POLICY IF EXISTS "Super admins can view all bills" ON public.master_bills;

CREATE POLICY "Super admins can view all bills"
ON public.master_bills
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin());

-- Update merchant_fee_profiles table
DROP POLICY IF EXISTS "Super admins can delete merchant fee profiles" ON public.merchant_fee_profiles;
DROP POLICY IF EXISTS "Super admins can insert merchant fee profiles" ON public.merchant_fee_profiles;
DROP POLICY IF EXISTS "Super admins can update merchant fee profiles" ON public.merchant_fee_profiles;
DROP POLICY IF EXISTS "Super admins can view all merchant fee profiles" ON public.merchant_fee_profiles;

CREATE POLICY "Super admins can delete merchant fee profiles"
ON public.merchant_fee_profiles
FOR DELETE
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can insert merchant fee profiles"
ON public.merchant_fee_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Super admins can update merchant fee profiles"
ON public.merchant_fee_profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can view all merchant fee profiles"
ON public.merchant_fee_profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());

-- Update merchant_payout_profiles table
DROP POLICY IF EXISTS "Super admins can insert merchant payout profiles" ON public.merchant_payout_profiles;
DROP POLICY IF EXISTS "Super admins can update merchant payout profiles" ON public.merchant_payout_profiles;
DROP POLICY IF EXISTS "Super admins can view all merchant payout profiles" ON public.merchant_payout_profiles;

CREATE POLICY "Super admins can insert merchant payout profiles"
ON public.merchant_payout_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Super admins can update merchant payout profiles"
ON public.merchant_payout_profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can view all merchant payout profiles"
ON public.merchant_payout_profiles
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());

-- Update business license related tables
DROP POLICY IF EXISTS "Super admins can manage all applications" ON public.business_license_applications;
DROP POLICY IF EXISTS "Super admins can manage all license comments" ON public.business_license_comments;
DROP POLICY IF EXISTS "Super admins can manage all documents" ON public.business_license_documents;
DROP POLICY IF EXISTS "Super admins can manage all license types" ON public.business_license_types;

CREATE POLICY "Super admins can manage all applications"
ON public.business_license_applications
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can manage all license comments"
ON public.business_license_comments
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can manage all documents"
ON public.business_license_documents
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can manage all license types"
ON public.business_license_types
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin());