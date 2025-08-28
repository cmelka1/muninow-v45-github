-- Drop the unused tax_calculations table and related function
-- This table is no longer used in the current system and contains only 1 old record

-- Drop the validation function that was designed for the old calculation system
DROP FUNCTION IF EXISTS public.validate_tax_calculation(text, jsonb);

-- Drop the tax_calculations table (indexes will be dropped automatically)
DROP TABLE IF EXISTS public.tax_calculations;