-- Update existing staged documents for paid tax submissions to confirmed status
UPDATE public.tax_submission_documents 
SET status = 'confirmed', updated_at = now()
WHERE status = 'staged' 
  AND tax_submission_id IN (
    SELECT id FROM public.tax_submissions 
    WHERE payment_status = 'paid'
  );