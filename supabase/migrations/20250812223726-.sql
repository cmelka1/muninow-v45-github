-- Add missing columns to tax_submissions table
ALTER TABLE public.tax_submissions 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN email TEXT;