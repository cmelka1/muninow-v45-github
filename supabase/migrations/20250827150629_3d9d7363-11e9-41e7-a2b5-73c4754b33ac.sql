-- Simplify tax_submissions table for user-input approach
-- Add fields for simplified tax calculation approach
ALTER TABLE public.tax_submissions 
ADD COLUMN calculation_notes TEXT,
ADD COLUMN total_amount_due_cents BIGINT;

-- Update existing tax_submissions to use simplified approach
-- Migrate existing complex calculation data to notes where possible
UPDATE public.tax_submissions 
SET 
  calculation_notes = COALESCE(
    CASE 
      WHEN tax_calculation_data IS NOT NULL 
      THEN 'Migrated from complex calculation: ' || tax_calculation_data::text
      ELSE 'No calculation details provided'
    END, 
    'No calculation details provided'
  ),
  total_amount_due_cents = COALESCE(amount_cents, 0)
WHERE calculation_notes IS NULL;

-- Make the new fields required for new submissions
ALTER TABLE public.tax_submissions 
ALTER COLUMN calculation_notes SET NOT NULL,
ALTER COLUMN total_amount_due_cents SET NOT NULL;