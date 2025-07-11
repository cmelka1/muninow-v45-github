-- Create payment_history table to track all payment transactions
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.master_bills(bill_id) ON DELETE CASCADE,
  finix_payment_instrument_id TEXT NOT NULL,
  finix_transfer_id TEXT,
  finix_merchant_id TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  service_fee_cents BIGINT NOT NULL,
  total_amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_type TEXT NOT NULL, -- 'Card', 'Bank Account', 'Google Pay', 'Apple Pay'
  transfer_state TEXT NOT NULL DEFAULT 'PENDING', -- 'SUCCEEDED', 'FAILED', 'PENDING'
  failure_code TEXT,
  failure_message TEXT,
  idempotency_id TEXT NOT NULL UNIQUE,
  fraud_session_id TEXT,
  finix_created_at TIMESTAMP WITH TIME ZONE,
  finix_updated_at TIMESTAMP WITH TIME ZONE,
  raw_finix_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_history
CREATE POLICY "Users can view their own payment history" 
ON public.payment_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment history" 
ON public.payment_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payment history" 
ON public.payment_history 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_bill_id ON public.payment_history(bill_id);
CREATE INDEX idx_payment_history_finix_transfer_id ON public.payment_history(finix_transfer_id);
CREATE INDEX idx_payment_history_idempotency_id ON public.payment_history(idempotency_id);