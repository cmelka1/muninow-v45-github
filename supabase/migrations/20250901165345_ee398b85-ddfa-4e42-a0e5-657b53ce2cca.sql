-- Add service_application_id column to payment_history table
ALTER TABLE public.payment_history 
ADD COLUMN service_application_id UUID REFERENCES public.municipal_service_applications(id);