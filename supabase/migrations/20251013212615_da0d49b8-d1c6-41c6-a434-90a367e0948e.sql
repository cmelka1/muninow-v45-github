-- Delete problematic business license LAK-2025-000003 and its payment transaction
-- This license has payment_status='unpaid' despite having a completed payment

-- Delete payment transaction first (child record)
DELETE FROM payment_transactions 
WHERE business_license_id = '47712e75-f84f-460a-8ab1-d5ad3971647e';

-- Delete business license application (parent record)
DELETE FROM business_license_applications 
WHERE id = '47712e75-f84f-460a-8ab1-d5ad3971647e';