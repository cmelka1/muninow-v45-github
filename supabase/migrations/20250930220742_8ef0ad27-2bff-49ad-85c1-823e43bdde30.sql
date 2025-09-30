-- Emergency cleanup: drop legacy smart_bill_matching function using correct signature
DROP FUNCTION IF EXISTS public.smart_bill_matching(text);