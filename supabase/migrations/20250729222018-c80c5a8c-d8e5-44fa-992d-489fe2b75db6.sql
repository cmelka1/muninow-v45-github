-- Fix ambiguous column reference in generate_permit_number function
CREATE OR REPLACE FUNCTION public.generate_permit_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  year_code TEXT;
  sequence_num INTEGER;
  permit_number TEXT;
BEGIN
  -- Get current year (last 2 digits)
  year_code := TO_CHAR(NOW(), 'YY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(permit_applications.permit_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.permit_applications
  WHERE permit_applications.permit_number LIKE 'PM' || year_code || '%';
  
  -- Format as PM + YY + 4-digit sequence
  permit_number := 'PM' || year_code || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN permit_number;
END;
$function$