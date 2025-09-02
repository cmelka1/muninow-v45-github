-- Clean up existing draft applications that are orphaned
DELETE FROM public.municipal_service_applications 
WHERE status = 'draft' 
AND id NOT IN (
  SELECT DISTINCT service_application_id 
  FROM public.payment_history 
  WHERE service_application_id IS NOT NULL
);