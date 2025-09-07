-- Add transfer_state column to permit_applications table
ALTER TABLE public.permit_applications 
ADD COLUMN transfer_state TEXT DEFAULT 'PENDING';

-- Update existing records to have the default value
UPDATE public.permit_applications 
SET transfer_state = 'PENDING' 
WHERE transfer_state IS NULL;

-- Add a check constraint to ensure valid values
ALTER TABLE public.permit_applications 
ADD CONSTRAINT permit_applications_transfer_state_check 
CHECK (transfer_state IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'));