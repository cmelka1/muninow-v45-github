-- Add email-based RLS policies for cmelka@muninow.com to access customers table
-- These policies will work even when auth.uid() is null but the user session is valid

CREATE POLICY "Allow cmelka@muninow.com to view all customers" 
ON public.customers 
FOR SELECT 
USING (
  auth.email() = 'cmelka@muninow.com'
);

CREATE POLICY "Allow cmelka@muninow.com to insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  auth.email() = 'cmelka@muninow.com'
);

CREATE POLICY "Allow cmelka@muninow.com to update customers" 
ON public.customers 
FOR UPDATE 
USING (
  auth.email() = 'cmelka@muninow.com'
);

CREATE POLICY "Allow cmelka@muninow.com to delete customers" 
ON public.customers 
FOR DELETE 
USING (
  auth.email() = 'cmelka@muninow.com'
);