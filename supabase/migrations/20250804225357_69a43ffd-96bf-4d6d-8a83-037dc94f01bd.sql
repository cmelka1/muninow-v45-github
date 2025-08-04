-- Create permit number sequences table for atomic number generation
CREATE TABLE IF NOT EXISTS public.permit_number_sequences (
  year_code TEXT PRIMARY KEY,
  next_sequence INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the sequences table
ALTER TABLE public.permit_number_sequences ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system access
CREATE POLICY "System can manage permit sequences" ON public.permit_number_sequences
FOR ALL USING (true);

-- Create atomic permit number generation function
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
  RETURNING next_sequence - 1 INTO sequence_num;
  
  -- Format as PM + YY + 4-digit sequence
  permit_number := 'PM' || year_code || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN permit_number;
END;
$$;

-- Update the trigger to always set permit number if null
CREATE OR REPLACE FUNCTION public.set_permit_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.permit_number IS NULL THEN
    NEW.permit_number := public.generate_permit_number();
  END IF;
  RETURN NEW;
END;
$$;