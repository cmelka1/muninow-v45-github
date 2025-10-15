-- Make total_amount_due_cents nullable since we don't know the final amount until payment is processed
ALTER TABLE public.tax_submissions 
ALTER COLUMN total_amount_due_cents DROP NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN public.tax_submissions.total_amount_due_cents IS 
'Total amount due including service fees. Nullable during draft status, populated after payment calculation.';