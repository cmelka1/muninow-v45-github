-- Drop the problematic policy that creates circular dependency
DROP POLICY IF EXISTS "Municipal users can view profiles of users with bills in their customer" ON public.profiles;

-- Create a new policy that allows municipal admins to view all profiles without circular dependency
CREATE POLICY "Municipal admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles requester 
    WHERE requester.id = auth.uid() 
    AND requester.account_type = 'municipal' 
    AND requester.customer_id IS NOT NULL
  )
);