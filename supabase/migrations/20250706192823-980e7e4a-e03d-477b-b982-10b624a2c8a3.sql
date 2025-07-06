-- Drop existing RLS policies for customer_payment_method table
DROP POLICY IF EXISTS "Customers can view their own payment methods" ON public.customer_payment_method;
DROP POLICY IF EXISTS "Super admin full access to customer payment methods" ON public.customer_payment_method;

-- Create new RLS policies following the same pattern as customers table
CREATE POLICY "Super admins can view all customer payment methods" 
ON public.customer_payment_method 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "Super admins can insert customer payment methods" 
ON public.customer_payment_method 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "Super admins can update customer payment methods" 
ON public.customer_payment_method 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "Super admins can delete customer payment methods" 
ON public.customer_payment_method 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);