-- Add public read access policy for municipality search during signup
CREATE POLICY "Allow public read access for municipality search" 
ON public.customers 
FOR SELECT 
TO anon
USING (true);