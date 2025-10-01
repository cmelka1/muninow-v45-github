-- Drop the restrictive RLS policy on payment_transactions
DROP POLICY IF EXISTS "Municipal users can view transactions for their customer" ON public.payment_transactions;

-- Create a new policy that works for municipaladmin, municipaluser, and municipal
CREATE POLICY "Municipal users can view transactions for their customer"
ON public.payment_transactions
FOR SELECT
USING (has_municipal_access_to_customer(auth.uid(), customer_id));

-- Add index on updated_at for better performance on date range queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_updated_at 
ON public.payment_transactions(updated_at);

-- Add composite index for common query pattern (customer_id + updated_at + payment_status)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_updated_status 
ON public.payment_transactions(customer_id, updated_at, payment_status);