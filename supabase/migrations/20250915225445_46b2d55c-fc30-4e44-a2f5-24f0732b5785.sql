-- Add 'resubmitted' to service_application_status_enum
ALTER TYPE service_application_status_enum ADD VALUE 'resubmitted';

-- Add resubmitted_at column to municipal_service_applications table
ALTER TABLE public.municipal_service_applications 
ADD COLUMN resubmitted_at timestamp with time zone;

-- Update trigger function to handle resubmitted status timestamp
CREATE OR REPLACE FUNCTION public.update_service_application_status_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set submitted_at when status changes to submitted
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.submitted_at = NOW();
  END IF;
  
  -- Set under_review_at when status changes to under_review
  IF NEW.status = 'under_review' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.under_review_at = NOW();
  END IF;
  
  -- Set information_requested_at when status changes to information_requested
  IF NEW.status = 'information_requested' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.information_requested_at = NOW();
  END IF;
  
  -- Set resubmitted_at when status changes to resubmitted
  IF NEW.status = 'resubmitted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.resubmitted_at = NOW();
  END IF;
  
  -- Set approved_at when status changes to approved
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.approved_at = NOW();
  END IF;
  
  -- Set denied_at when status changes to denied
  IF NEW.status = 'denied' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.denied_at = NOW();
  END IF;
  
  -- Set withdrawn_at when status changes to withdrawn
  IF NEW.status = 'withdrawn' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.withdrawn_at = NOW();
  END IF;
  
  -- Set expired_at when status changes to expired
  IF NEW.status = 'expired' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.expired_at = NOW();
  END IF;
  
  -- Set issued_at when status changes to issued
  IF NEW.status = 'issued' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.issued_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;