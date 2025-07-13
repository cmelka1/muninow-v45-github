-- Fix the bill matching trigger timing issue
-- Drop the existing BEFORE INSERT trigger
DROP TRIGGER IF EXISTS new_user_bill_matching ON public.profiles;

-- Recreate as AFTER INSERT trigger to ensure profile exists before queuing bill matching
CREATE TRIGGER new_user_bill_matching
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_bill_matching_for_new_user();