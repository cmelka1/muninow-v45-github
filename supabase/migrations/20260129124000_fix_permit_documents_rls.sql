-- Fix RLS policies for permit_documents table
-- The existing policies use 'municipal' account_type but the app now uses 'municipaladmin' and 'municipaluser'
-- This migration updates all municipal-related policies to use the helper function

-- =============================================================================
-- FIX permit_documents TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Municipal users can view permit documents for their customer" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal users can insert permit documents for their customer" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal users can update permit documents for their customer" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal users can delete permit documents for their customer" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal users can view documents for their customer permits" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal staff view permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal staff insert permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal staff update permit documents" ON public.permit_documents;
DROP POLICY IF EXISTS "Municipal staff delete permit documents" ON public.permit_documents;

CREATE POLICY "Municipal staff view permit documents"
ON public.permit_documents
FOR SELECT
TO authenticated
USING (
  public.has_municipal_access_to_customer(auth.uid(), customer_id)
);

CREATE POLICY "Municipal staff insert permit documents"
ON public.permit_documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_municipal_access_to_customer(auth.uid(), customer_id)
);

CREATE POLICY "Municipal staff update permit documents"
ON public.permit_documents
FOR UPDATE
TO authenticated
USING (
  public.has_municipal_access_to_customer(auth.uid(), customer_id)
);

CREATE POLICY "Municipal staff delete permit documents"
ON public.permit_documents
FOR DELETE
TO authenticated
USING (
  public.has_municipal_access_to_customer(auth.uid(), customer_id)
);
