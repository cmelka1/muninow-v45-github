-- Phase 2: Update RLS Policies to use Security Definer Functions

-- Update bill_notifications policies
DROP POLICY IF EXISTS "Municipal users can insert notifications for their customer bil" ON public.bill_notifications;
DROP POLICY IF EXISTS "Municipal users can view notifications for their customer bills" ON public.bill_notifications;

CREATE POLICY "Municipal users can insert notifications for their customer bills" 
ON public.bill_notifications 
FOR INSERT 
WITH CHECK (public.has_municipal_access_to_customer(auth.uid(), customer_id));

CREATE POLICY "Municipal users can view notifications for their customer bills" 
ON public.bill_notifications 
FOR SELECT 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

-- Update business_license_applications policies
DROP POLICY IF EXISTS "Municipal users can update applications for their customer" ON public.business_license_applications;
DROP POLICY IF EXISTS "Municipal users can view applications for their customer" ON public.business_license_applications;

CREATE POLICY "Municipal users can update applications for their customer" 
ON public.business_license_applications 
FOR UPDATE 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

CREATE POLICY "Municipal users can view applications for their customer" 
ON public.business_license_applications 
FOR SELECT 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

-- Update business_license_comments policies
DROP POLICY IF EXISTS "Municipal users can create comments for their customer licenses" ON public.business_license_comments;
DROP POLICY IF EXISTS "Municipal users can view all comments for their customer licens" ON public.business_license_comments;

CREATE POLICY "Municipal users can create comments for their customer licenses" 
ON public.business_license_comments 
FOR INSERT 
WITH CHECK (
  reviewer_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM business_license_applications bla 
    WHERE bla.id = license_id AND public.has_municipal_access_to_customer(auth.uid(), bla.customer_id)
  )
);

CREATE POLICY "Municipal users can view all comments for their customer licenses" 
ON public.business_license_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM business_license_applications bla 
    WHERE bla.id = license_id AND public.has_municipal_access_to_customer(auth.uid(), bla.customer_id)
  )
);

-- Update business_license_documents policies
DROP POLICY IF EXISTS "Municipal users can view documents for their customer applicati" ON public.business_license_documents;

CREATE POLICY "Municipal users can view documents for their customer applications" 
ON public.business_license_documents 
FOR SELECT 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

-- Update business_license_types policies
DROP POLICY IF EXISTS "Municipal users can manage license types for their customer" ON public.business_license_types;

CREATE POLICY "Municipal users can manage license types for their customer" 
ON public.business_license_types 
FOR ALL 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

-- Update master_bills policies
DROP POLICY IF EXISTS "Municipal users can delete bills for their customer" ON public.master_bills;
DROP POLICY IF EXISTS "Municipal users can insert bills for their customer" ON public.master_bills;
DROP POLICY IF EXISTS "Municipal users can update bills for their customer" ON public.master_bills;
DROP POLICY IF EXISTS "Municipal users can view bills for their customer" ON public.master_bills;

CREATE POLICY "Municipal users can delete bills for their customer" 
ON public.master_bills 
FOR DELETE 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

CREATE POLICY "Municipal users can insert bills for their customer" 
ON public.master_bills 
FOR INSERT 
WITH CHECK (public.has_municipal_access_to_customer(auth.uid(), customer_id));

CREATE POLICY "Municipal users can update bills for their customer" 
ON public.master_bills 
FOR UPDATE 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));

CREATE POLICY "Municipal users can view bills for their customer" 
ON public.master_bills 
FOR SELECT 
USING (public.has_municipal_access_to_customer(auth.uid(), customer_id));