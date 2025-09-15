-- Fix search path security issue for the generate_license_number function
ALTER FUNCTION public.generate_license_number() SET search_path = public;