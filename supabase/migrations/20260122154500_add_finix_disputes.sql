-- =============================================
-- Migration: Add Finix Disputes Table
-- Purpose: Store dispute/chargeback data from Finix webhooks
-- =============================================

-- Create disputes table
CREATE TABLE IF NOT EXISTS public.finix_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Finix dispute identifiers
  finix_dispute_id TEXT UNIQUE NOT NULL,
  finix_transfer_id TEXT,
  finix_application_id TEXT,
  finix_identity_id TEXT,
  
  -- Link to local transaction
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  merchant_id UUID REFERENCES public.merchants(id),
  
  -- Dispute details
  state TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, WON, LOST, INQUIRY
  reason TEXT, -- FRAUD, DUPLICATE, etc.
  amount_cents INTEGER NOT NULL,
  
  -- Deadlines
  respond_by TIMESTAMPTZ,
  occurred_at TIMESTAMPTZ,
  
  -- Additional details
  message TEXT,
  dispute_details JSONB,
  tags JSONB,
  
  -- Evidence tracking
  evidence_submitted BOOLEAN DEFAULT false,
  evidence_count INTEGER DEFAULT 0,
  
  -- Webhook tracking
  last_webhook_event_id TEXT,
  last_webhook_received_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_finix_disputes_transfer 
  ON public.finix_disputes(finix_transfer_id);
CREATE INDEX IF NOT EXISTS idx_finix_disputes_state 
  ON public.finix_disputes(state);
CREATE INDEX IF NOT EXISTS idx_finix_disputes_merchant 
  ON public.finix_disputes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_finix_disputes_respond_by 
  ON public.finix_disputes(respond_by) WHERE state = 'PENDING';

-- Enable RLS
ALTER TABLE public.finix_disputes ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to disputes"
  ON public.finix_disputes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE public.finix_disputes IS 'Stores Finix dispute/chargeback events for tracking and resolution';
