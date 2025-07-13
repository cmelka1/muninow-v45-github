-- Fix data type mismatch in get_user_bill_summary_for_municipal function
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
  -- Get the customer_id of the requesting municipal user with explicit table alias
  SELECT profiles.customer_id INTO requesting_customer_id
  FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.account_type = 'municipal';
  
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
    COALESCE(bill_summary.total_amount_due_cents::bigint, 0) as total_amount_due_cents,
    COALESCE(bill_summary.bill_count, 0) > 0 as has_bills
  FROM public.profiles
  LEFT JOIN (
    SELECT 
      mb.user_id,
      COUNT(*) as bill_count,
      SUM(mb.amount_due_cents)::bigint as total_amount_due_cents
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
        WHERE master_bills.user_id = p_user_id 
        AND master_bills.customer_id = requesting_customer_id
      )
      -- Or is accessible via the profile function (keeps existing logic)
      OR profiles.id IN (
        SELECT get_user_profile_for_municipal.id 
        FROM public.get_user_profile_for_municipal(p_user_id)
      )
    );
END;
$$;