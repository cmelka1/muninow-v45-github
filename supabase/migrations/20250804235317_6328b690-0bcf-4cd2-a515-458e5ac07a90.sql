-- Fix duplicate permit number issue by initializing sequence table and improving concurrency
-- Initialize the permit number sequence for current year if not exists
INSERT INTO public.permit_number_sequences (year_code, next_sequence, updated_at)
VALUES ('25', 1, NOW())
ON CONFLICT (year_code) DO NOTHING;

-- Improve the generate_permit_number function with better concurrency handling
CREATE OR REPLACE FUNCTION public.generate_permit_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year_code TEXT;
  sequence_num INTEGER;
  permit_number TEXT;
BEGIN
  -- Get current year (last 2 digits)
  current_year_code := TO_CHAR(NOW(), 'YY');
  
  -- Use advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('permit_number_generation'));
  
  -- Atomically get and increment the sequence number
  INSERT INTO public.permit_number_sequences (year_code, next_sequence, updated_at)
  VALUES (current_year_code, 2, NOW())
  ON CONFLICT (year_code) 
  DO UPDATE SET 
    next_sequence = permit_number_sequences.next_sequence + 1,
    updated_at = NOW()
  RETURNING permit_number_sequences.next_sequence - 1 INTO sequence_num;
  
  -- Format as PM + YY + 4-digit sequence
  permit_number := 'PM' || current_year_code || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN permit_number;
END;
$$;

-- Ensure the trigger exists to automatically set permit numbers
DROP TRIGGER IF EXISTS set_permit_number_trigger ON public.permit_applications;
CREATE TRIGGER set_permit_number_trigger
  BEFORE INSERT ON public.permit_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_permit_number();