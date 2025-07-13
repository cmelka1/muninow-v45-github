-- Phase 1: Critical Fixes for Municipal User Details Performance

-- Fix 1: Resolve ambiguous column reference in get_user_profile_for_municipal
CREATE OR REPLACE FUNCTION public.get_user_profile_for_municipal(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  street_address text,
  apt_number text,
  city text,
  state text,
  zip_code text,
  account_type text,
  business_legal_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_customer_id uuid;
BEGIN
  -- Get the customer_id of the requesting municipal user
  SELECT customer_id INTO requesting_customer_id
  FROM public.profiles
  WHERE id = auth.uid() AND account_type = 'municipal';
  
  -- If not a municipal user, return no results
  IF requesting_customer_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if the requested user has bills for this customer
  IF NOT EXISTS (
    SELECT 1 FROM public.master_bills 
    WHERE user_id = p_user_id 
    AND customer_id = requesting_customer_id
  ) THEN
    RETURN;
  END IF;
  
  -- Return the user profile with explicit table alias
  RETURN QUERY
  SELECT 
    profiles.id,
    profiles.first_name,
    profiles.last_name,
    profiles.email,
    profiles.phone,
    profiles.street_address,
    profiles.apt_number,
    profiles.city,
    profiles.state,
    profiles.zip_code,
    profiles.account_type,
    profiles.business_legal_name,
    profiles.created_at,
    profiles.updated_at
  FROM public.profiles
  WHERE profiles.id = p_user_id;
END;
$$;

-- Fix 2: Add missing performance indexes
-- Index for municipal user profile access (already exists, ensure it's there)
CREATE INDEX IF NOT EXISTS idx_master_bills_customer_user 
ON public.master_bills(customer_id, user_id);

-- Add index for payment history lookups
CREATE INDEX IF NOT EXISTS idx_payment_history_customer_user 
ON public.payment_history(customer_id, user_id);

-- Add index for profiles municipal lookup (already exists, ensure it's there)
CREATE INDEX IF NOT EXISTS idx_profiles_municipal_lookup 
ON public.profiles(account_type, customer_id) 
WHERE account_type = 'municipal';

-- Add index for bill status and payment status queries
CREATE INDEX IF NOT EXISTS idx_master_bills_user_status 
ON public.master_bills(user_id, bill_status, payment_status);

-- Add index for payment history user lookups
CREATE INDEX IF NOT EXISTS idx_payment_history_user_created 
ON public.payment_history(user_id, created_at DESC);

-- Fix 3: Create optimized bill summary function for better performance
CREATE OR REPLACE FUNCTION public.get_user_bill_summary_for_municipal(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  street_address text,
  apt_number text,
  city text,
  state text,
  zip_code text,
  account_type text,
  business_legal_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  bill_count bigint,
  total_amount_due_cents bigint,
  has_bills boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_customer_id uuid;
BEGIN
  -- Get the customer_id of the requesting municipal user
  SELECT customer_id INTO requesting_customer_id
  FROM public.profiles
  WHERE id = auth.uid() AND account_type = 'municipal';
  
  -- If not a municipal user, return no results
  IF requesting_customer_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return user profile with bill summary
  RETURN QUERY
  SELECT 
    profiles.id as user_id,
    profiles.first_name,
    profiles.last_name,
    profiles.email,
    profiles.phone,
    profiles.street_address,
    profiles.apt_number,
    profiles.city,
    profiles.state,
    profiles.zip_code,
    profiles.account_type,
    profiles.business_legal_name,
    profiles.created_at,
    profiles.updated_at,
    COALESCE(bill_summary.bill_count, 0) as bill_count,
    COALESCE(bill_summary.total_amount_due_cents, 0) as total_amount_due_cents,
    COALESCE(bill_summary.bill_count, 0) > 0 as has_bills
  FROM public.profiles
  LEFT JOIN (
    SELECT 
      mb.user_id,
      COUNT(*) as bill_count,
      SUM(mb.amount_due_cents) as total_amount_due_cents
    FROM public.master_bills mb
    WHERE mb.customer_id = requesting_customer_id
      AND mb.user_id = p_user_id
    GROUP BY mb.user_id
  ) bill_summary ON profiles.id = bill_summary.user_id
  WHERE profiles.id = p_user_id
    AND (
      -- Either user has bills for this customer
      EXISTS (
        SELECT 1 FROM public.master_bills 
        WHERE user_id = p_user_id 
        AND customer_id = requesting_customer_id
      )
      -- Or is accessible via the profile function (keeps existing logic)
      OR profiles.id IN (
        SELECT get_user_profile_for_municipal.id 
        FROM public.get_user_profile_for_municipal(p_user_id)
      )
    );
END;
$$;