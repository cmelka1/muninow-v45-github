-- Phase 1 Cleanup: Drop customer-related tables

-- First drop customer_payment_method table (has foreign key to customers)
DROP TABLE IF EXISTS public.customer_payment_method CASCADE;

-- Then drop customers table
DROP TABLE IF EXISTS public.customers CASCADE;