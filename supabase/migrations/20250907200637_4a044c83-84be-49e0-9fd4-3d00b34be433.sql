-- Clean up existing payment data and add missing functions

-- Create update_unified_payment_status function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_unified_payment_status(
  p_payment_history_id uuid,
  p_finix_transfer_id text,
  p_transfer_state text,
  p_payment_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.payment_history
  SET 
    finix_transfer_id = p_finix_transfer_id,
    transfer_state = p_transfer_state,
    payment_status = CASE 
      WHEN p_payment_status = 'completed' THEN 'paid'
      WHEN p_payment_status = 'pending' THEN 'unpaid'
      ELSE p_payment_status
    END,
    updated_at = now()
  WHERE id = p_payment_history_id;
  
  RETURN FOUND;
END;
$$;

-- Clean up existing payment statuses - replace 'pending' with 'unpaid', 'completed' with 'paid'
UPDATE public.payment_history 
SET payment_status = 'unpaid' 
WHERE payment_status = 'pending';

UPDATE public.payment_history 
SET payment_status = 'paid' 
WHERE payment_status = 'completed';

-- Update permit applications - replace 'pending' with 'unpaid', 'completed' with 'paid'
UPDATE public.permit_applications 
SET payment_status = 'unpaid' 
WHERE payment_status = 'pending';

UPDATE public.permit_applications 
SET payment_status = 'paid' 
WHERE payment_status = 'completed';

-- Update business license applications - replace 'pending' with 'unpaid', 'completed' with 'paid'
UPDATE public.business_license_applications 
SET payment_status = 'unpaid' 
WHERE payment_status = 'pending';

UPDATE public.business_license_applications 
SET payment_status = 'paid' 
WHERE payment_status = 'completed';

-- Update tax submissions - replace 'pending' with 'unpaid', 'completed' with 'paid'
UPDATE public.tax_submissions 
SET payment_status = 'unpaid' 
WHERE payment_status = 'pending';

UPDATE public.tax_submissions 
SET payment_status = 'paid' 
WHERE payment_status = 'completed';

-- Clean up orphaned payment_history records (those without a corresponding Finix transfer ID and unpaid status)
-- We'll keep them but mark them clearly as failed
UPDATE public.payment_history 
SET 
  payment_status = 'unpaid',
  transfer_state = 'FAILED',
  updated_at = now()
WHERE finix_transfer_id IS NULL 
  AND payment_status != 'paid' 
  AND created_at < now() - INTERVAL '1 hour'; -- Only records older than 1 hour

-- Log the cleanup results
DO $$
DECLARE
  cleanup_count integer;
BEGIN
  -- Count cleaned up records
  SELECT COUNT(*) INTO cleanup_count
  FROM public.payment_history 
  WHERE transfer_state = 'FAILED' AND finix_transfer_id IS NULL;
  
  RAISE NOTICE 'Payment data cleanup completed. Marked % orphaned records as failed.', cleanup_count;
END $$;