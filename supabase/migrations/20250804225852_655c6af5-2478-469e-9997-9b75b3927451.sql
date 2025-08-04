-- Fix the ambiguous column reference in generate_permit_number function
CREATE OR REPLACE FUNCTION public.generate_permit_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_code TEXT;
  sequence_num INTEGER;
  permit_number TEXT;
BEGIN
  -- Get current year (last 2 digits)
  year_code := TO_CHAR(NOW(), 'YY');
  
  -- Atomically get and increment the sequence number
  INSERT INTO public.permit_number_sequences (year_code, next_sequence)
  VALUES (year_code, 2)
  ON CONFLICT (year_code) 
  DO UPDATE SET 
    next_sequence = permit_number_sequences.next_sequence + 1,
    updated_at = NOW()
  RETURNING permit_number_sequences.next_sequence - 1 INTO sequence_num;
  
  -- Format as PM + YY + 4-digit sequence
  permit_number := 'PM' || year_code || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN permit_number;
END;
$$;