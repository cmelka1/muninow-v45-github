-- Emergency Fix: Drop smart_bill_matching function with correct signature
-- This function was referencing the deprecated bill system

DROP FUNCTION IF EXISTS public.smart_bill_matching(p_user_id uuid, p_customer_id uuid);