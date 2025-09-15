-- Phase 2: Add reason fields to municipal_service_applications table for alignment with permits/licenses
ALTER TABLE public.municipal_service_applications 
ADD COLUMN denial_reason text,
ADD COLUMN withdrawal_reason text,
ADD COLUMN information_request_reason text;

-- Update the status enum to include 'rejected' status
ALTER TYPE service_application_status ADD VALUE 'rejected';

-- Add comment for documentation
COMMENT ON COLUMN public.municipal_service_applications.denial_reason IS 'Reason provided when application is denied/rejected';
COMMENT ON COLUMN public.municipal_service_applications.withdrawal_reason IS 'Reason provided when application is withdrawn';
COMMENT ON COLUMN public.municipal_service_applications.information_request_reason IS 'Reason/details when additional information is requested';