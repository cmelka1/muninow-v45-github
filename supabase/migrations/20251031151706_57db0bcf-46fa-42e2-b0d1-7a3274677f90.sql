-- Backfill submitted_at for tax submissions
-- Copy submission_date to submitted_at where submitted_at is null
UPDATE tax_submissions
SET submitted_at = submission_date
WHERE submitted_at IS NULL;