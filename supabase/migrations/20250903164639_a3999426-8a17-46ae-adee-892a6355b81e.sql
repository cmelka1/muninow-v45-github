-- Add "issued" status to service application status enum
ALTER TYPE service_application_status_enum ADD VALUE 'issued';

-- Add payment_processed_at column to payment_history table
ALTER TABLE public.payment_history 
ADD COLUMN payment_processed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on payment_processed_at queries
CREATE INDEX idx_payment_history_payment_processed_at 
ON public.payment_history (payment_processed_at) 
WHERE payment_processed_at IS NOT NULL;