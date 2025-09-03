-- Phase 2 continued: Delete remaining application records for Hinsdale customer
-- Delete tax submissions
DELETE FROM public.tax_submissions 
WHERE customer_id = 'd20b3740-65ff-4408-b8ec-8cba38a8a687';

-- Delete municipal service applications
DELETE FROM public.municipal_service_applications 
WHERE customer_id = 'd20b3740-65ff-4408-b8ec-8cba38a8a687';

-- Delete permit applications
DELETE FROM public.permit_applications 
WHERE customer_id = 'd20b3740-65ff-4408-b8ec-8cba38a8a687';

-- Delete business license applications
DELETE FROM public.business_license_applications 
WHERE customer_id = 'd20b3740-65ff-4408-b8ec-8cba38a8a687';