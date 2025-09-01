-- Add renewal functionality columns to municipal_service_tiles table
ALTER TABLE public.municipal_service_tiles 
ADD COLUMN is_renewable boolean DEFAULT false,
ADD COLUMN renewal_frequency text CHECK (renewal_frequency IN ('annual', 'quarterly')),
ADD COLUMN renewal_reminder_days integer DEFAULT 30,
ADD COLUMN auto_renew_enabled boolean DEFAULT false;