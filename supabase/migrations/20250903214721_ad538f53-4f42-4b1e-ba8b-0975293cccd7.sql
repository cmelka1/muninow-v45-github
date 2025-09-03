-- Fix RLS policies to use lowercase role names
-- Manual update of policies that reference camelCase role names

-- Drop and recreate policies that reference 'superAdmin'
DROP POLICY IF EXISTS "Super admins can manage all applications" ON public.business_license_applications;
CREATE POLICY "Super admins can manage all applications" 
ON public.business_license_applications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can manage all license comments" ON public.business_license_comments;
CREATE POLICY "Super admins can manage all license comments" 
ON public.business_license_comments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can manage all documents" ON public.business_license_documents;
CREATE POLICY "Super admins can manage all documents" 
ON public.business_license_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can manage all license types" ON public.business_license_types;
CREATE POLICY "Super admins can manage all license types" 
ON public.business_license_types 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can delete customers" ON public.customers;
CREATE POLICY "Super admins can delete customers" 
ON public.customers 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can insert customers" ON public.customers;
CREATE POLICY "Super admins can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can update customers" ON public.customers;
CREATE POLICY "Super admins can update customers" 
ON public.customers 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can view all customers" ON public.customers;
CREATE POLICY "Super admins can view all customers" 
ON public.customers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can view all bills" ON public.master_bills;
CREATE POLICY "Super admins can view all bills" 
ON public.master_bills 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can delete merchant fee profiles" ON public.merchant_fee_profiles;
CREATE POLICY "Super admins can delete merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can insert merchant fee profiles" ON public.merchant_fee_profiles;
CREATE POLICY "Super admins can insert merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can update merchant fee profiles" ON public.merchant_fee_profiles;
CREATE POLICY "Super admins can update merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can view all merchant fee profiles" ON public.merchant_fee_profiles;
CREATE POLICY "Super admins can view all merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can insert merchant payout profiles" ON public.merchant_payout_profiles;
CREATE POLICY "Super admins can insert merchant payout profiles" 
ON public.merchant_payout_profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can update merchant payout profiles" ON public.merchant_payout_profiles;
CREATE POLICY "Super admins can update merchant payout profiles" 
ON public.merchant_payout_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can view all merchant payout profiles" ON public.merchant_payout_profiles;
CREATE POLICY "Super admins can view all merchant payout profiles" 
ON public.merchant_payout_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can insert merchants" ON public.merchants;
CREATE POLICY "Super admins can insert merchants" 
ON public.merchants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can update merchants" ON public.merchants;
CREATE POLICY "Super admins can update merchants" 
ON public.merchants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);

DROP POLICY IF EXISTS "Super admins can view all merchants" ON public.merchants;
CREATE POLICY "Super admins can view all merchants" 
ON public.merchants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM (user_roles ur JOIN roles r ON ((r.id = ur.role_id)))
    WHERE ((ur.user_id = auth.uid()) AND (r.name = 'superadmin'::text))
  )
);