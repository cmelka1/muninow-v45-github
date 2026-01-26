-- Drop the single-admin-per-customer restriction permanently
-- Allows multiple municipaladmin users per customer/municipality

DROP INDEX IF EXISTS public.unique_municipal_customer_admin;
