-- Phase 2 fix: Delete permit notifications first to resolve foreign key constraint
-- Then delete remaining application records for Hinsdale customer

-- Delete permit notifications for Hinsdale permits
DELETE FROM public.permit_notifications 
WHERE permit_id IN (
  SELECT permit_id FROM public.permit_applications 
  WHERE customer_id = 'd20b3740-65ff-4408-b8ec-8cba38a8a687'
);

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