-- Fix RLS policies for municipal_service_application_comments table
-- Problem: Policies check for account_type = 'municipal' but actual types are 'municipaladmin' and 'municipaluser'

-- Drop the incorrect policies
DROP POLICY IF EXISTS "Municipal users can create comments for their customer applications" 
ON public.municipal_service_application_comments;

DROP POLICY IF EXISTS "Municipal users can view comments for their customer applications" 
ON public.municipal_service_application_comments;

-- Recreate with correct account type checks
CREATE POLICY "Municipal users can create comments for their customer applications"
ON public.municipal_service_application_comments
FOR INSERT
WITH CHECK (
  reviewer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM municipal_service_applications msa
    JOIN municipal_service_tiles mst ON mst.id = msa.tile_id
    JOIN profiles p ON p.id = auth.uid()
    WHERE msa.id = municipal_service_application_comments.application_id
    AND p.account_type IN ('municipaladmin', 'municipaluser')
    AND p.customer_id = mst.customer_id
  )
);

CREATE POLICY "Municipal users can view comments for their customer applications"
ON public.municipal_service_application_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM municipal_service_applications msa
    JOIN municipal_service_tiles mst ON mst.id = msa.tile_id
    JOIN profiles p ON p.id = auth.uid()
    WHERE msa.id = municipal_service_application_comments.application_id
    AND p.account_type IN ('municipaladmin', 'municipaluser')
    AND p.customer_id = mst.customer_id
  )
);