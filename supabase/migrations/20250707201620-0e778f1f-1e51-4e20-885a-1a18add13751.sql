-- Add email tracking fields to organization_invitations table
ALTER TABLE public.organization_invitations 
ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed'));