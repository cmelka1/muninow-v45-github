-- Fix search path for the new functions created in the business license migration
-- This addresses the security linter warnings for function search path mutability

ALTER FUNCTION public.generate_license_number() SET search_path = public;
ALTER FUNCTION public.set_license_number() SET search_path = public;
ALTER FUNCTION public.update_license_status_timestamps() SET search_path = public;
ALTER FUNCTION public.create_license_status_notification() SET search_path = public;