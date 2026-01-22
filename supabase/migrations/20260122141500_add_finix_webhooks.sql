-- Create table for logging Finix webhooks
CREATE TABLE IF NOT EXISTS public.finix_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,      -- Finix event ID (e.g., event_xxxxx)
    event_type TEXT NOT NULL,    -- e.g., transfer.succeeded
    entity_id TEXT,              -- The Finix entity ID (e.g., transfer ID)
    payload JSONB NOT NULL,      -- Full webhook payload
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'pending', -- pending, processed, failed, ignored
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finix_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow service_role (Edge Functions) to do everything
CREATE POLICY "Service role can manage webhook logs" ON public.finix_webhook_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view logs (for admins/debugging)
CREATE POLICY "Authenticated users can view webhook logs" ON public.finix_webhook_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Add tracking columns to payment_transactions
ALTER TABLE public.payment_transactions 
ADD COLUMN IF NOT EXISTS last_webhook_event_id TEXT;

ALTER TABLE public.payment_transactions 
ADD COLUMN IF NOT EXISTS last_webhook_received_at TIMESTAMP WITH TIME ZONE;
