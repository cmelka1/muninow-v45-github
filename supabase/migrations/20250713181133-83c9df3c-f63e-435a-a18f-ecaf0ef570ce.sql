-- Add RLS policies for municipal users to access master_bills for their customer_id

-- Municipal users can view bills for their customer
CREATE POLICY "Municipal users can view bills for their customer" 
ON public.master_bills 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = master_bills.customer_id
  )
);

-- Municipal users can insert bills for their customer
CREATE POLICY "Municipal users can insert bills for their customer" 
ON public.master_bills 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = master_bills.customer_id
  )
);

-- Municipal users can update bills for their customer
CREATE POLICY "Municipal users can update bills for their customer" 
ON public.master_bills 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = master_bills.customer_id
  )
);

-- Municipal users can delete bills for their customer
CREATE POLICY "Municipal users can delete bills for their customer" 
ON public.master_bills 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = master_bills.customer_id
  )
);