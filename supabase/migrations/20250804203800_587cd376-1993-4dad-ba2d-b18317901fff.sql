-- Create a policy that allows users to see profile information for people who have commented on the same permits they have access to

-- Drop existing restrictive policy temporarily to avoid conflicts
DROP POLICY IF EXISTS "Users can only view own profile" ON public.profiles;

-- Create new permissive policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow users to view profiles of people who have commented on permits they have access to
CREATE POLICY "Users can view commenter profiles on accessible permits" 
ON public.profiles 
FOR SELECT 
USING (
  -- Municipal users can see profiles of people who commented on permits for their customer
  EXISTS (
    SELECT 1 FROM public.permit_review_comments prc
    JOIN public.permit_applications pa ON pa.permit_id = prc.permit_id
    WHERE prc.reviewer_id = profiles.id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.account_type = 'municipal' 
      AND p.customer_id = pa.customer_id
    )
  )
  OR
  -- Permit applicants can see profiles of municipal staff who commented on their permits
  EXISTS (
    SELECT 1 FROM public.permit_review_comments prc
    JOIN public.permit_applications pa ON pa.permit_id = prc.permit_id
    WHERE prc.reviewer_id = profiles.id
    AND pa.user_id = auth.uid()
  )
);