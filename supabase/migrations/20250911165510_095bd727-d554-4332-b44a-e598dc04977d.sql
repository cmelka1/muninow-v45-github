-- Fix RLS policies for municipal_business_license_types to accept municipaluser and municipaladmin
DROP POLICY IF EXISTS "Municipal users can manage their customer license types" ON public.municipal_business_license_types;

CREATE POLICY "Municipal users can manage their customer license types" ON public.municipal_business_license_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipal', 'municipaluser', 'municipaladmin')
    AND profiles.customer_id = municipal_business_license_types.customer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipal', 'municipaluser', 'municipaladmin')
    AND profiles.customer_id = municipal_business_license_types.customer_id
  )
);

-- Fix RLS policies for municipal_permit_questions to accept municipaluser and municipaladmin
DROP POLICY IF EXISTS "Municipal users can manage permit questions for their customer" ON public.municipal_permit_questions;

CREATE POLICY "Municipal users can manage permit questions for their customer" ON public.municipal_permit_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipal', 'municipaluser', 'municipaladmin')
    AND profiles.customer_id = municipal_permit_questions.customer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipal', 'municipaluser', 'municipaladmin')
    AND profiles.customer_id = municipal_permit_questions.customer_id
  )
);

-- Fix RLS policies for municipal_tax_types to accept municipaluser and municipaladmin
DROP POLICY IF EXISTS "Municipal users can manage tax types for their customer" ON public.municipal_tax_types;

CREATE POLICY "Municipal users can manage tax types for their customer" ON public.municipal_tax_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipal', 'municipaluser', 'municipaladmin')
    AND profiles.customer_id = municipal_tax_types.customer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.account_type IN ('municipal', 'municipaluser', 'municipaladmin')
    AND profiles.customer_id = municipal_tax_types.customer_id
  )
);