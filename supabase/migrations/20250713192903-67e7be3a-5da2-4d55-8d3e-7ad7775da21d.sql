-- Add RLS policy to allow municipal admins to view profiles of users with bills in their municipality
CREATE POLICY "Municipal users can view profiles of users with bills in their customer" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles requester 
    WHERE requester.id = auth.uid() 
    AND requester.account_type = 'municipal' 
    AND requester.customer_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.master_bills 
      WHERE master_bills.user_id = profiles.id 
      AND master_bills.customer_id = requester.customer_id
    )
  )
);