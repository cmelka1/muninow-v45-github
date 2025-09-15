-- Remove 'paid' and 'completed' statuses from service_application_status_enum
-- and drop redundant columns to align with permit schema

-- First, update any existing records that have 'paid' or 'completed' status to 'issued'
UPDATE municipal_service_applications 
SET status = 'issued' 
WHERE status IN ('paid', 'completed');

-- Remove the 'paid' and 'completed' values from the enum
ALTER TYPE service_application_status_enum RENAME TO service_application_status_enum_old;

CREATE TYPE service_application_status_enum AS ENUM (
  'draft',
  'submitted', 
  'under_review',
  'information_requested',
  'resubmitted',
  'approved',
  'denied',
  'withdrawn',
  'expired',
  'issued'
);

-- Update the column to use the new enum
ALTER TABLE municipal_service_applications 
  ALTER COLUMN status TYPE service_application_status_enum 
  USING status::text::service_application_status_enum;

-- Drop the old enum
DROP TYPE service_application_status_enum_old;

-- Drop the redundant columns that are not used in permits
ALTER TABLE municipal_service_applications 
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS payment_id;

-- Ensure we have the same fields as permits for payment tracking
-- Add payment_processed_at if it doesn't exist (to match permits)
ALTER TABLE municipal_service_applications 
  ADD COLUMN IF NOT EXISTS payment_processed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS finix_transfer_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Add status timestamp triggers to match permits
ALTER TABLE municipal_service_applications 
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS under_review_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS information_requested_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS resubmitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS denied_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS expired_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS issued_at timestamp with time zone;

-- Create trigger function for service application status timestamps (matching permits)
CREATE OR REPLACE FUNCTION public.update_service_application_status_timestamps()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create the trigger for service applications (matching permits)
DROP TRIGGER IF EXISTS update_service_application_status_timestamps_trigger ON municipal_service_applications;
CREATE TRIGGER update_service_application_status_timestamps_trigger
  BEFORE UPDATE ON municipal_service_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_application_status_timestamps();