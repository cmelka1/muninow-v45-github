-- Create enums for payout profile fields
CREATE TYPE payout_frequency AS ENUM ('DAILY', 'MONTHLY', 'CONTINUOUS');
CREATE TYPE payout_rail AS ENUM ('NEXT_DAY_ACH', 'SAME_DAY_ACH');
CREATE TYPE payout_type AS ENUM ('GROSS', 'NET');
CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'error');

-- Create merchant_payout_profiles table
CREATE TABLE public.merchant_payout_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  finix_payout_profile_id TEXT,
  type payout_type NOT NULL DEFAULT 'GROSS',
  sync_status sync_status NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- NET type fields
  net_frequency payout_frequency,
  net_submission_delay_days INTEGER,
  net_payment_instrument_id TEXT,
  net_rail payout_rail,
  
  -- GROSS type fields (nullable for NET)
  gross_payouts_frequency payout_frequency,
  gross_payouts_submission_delay_days INTEGER,
  gross_payouts_payment_instrument_id TEXT,
  gross_payouts_rail payout_rail,
  gross_fees_frequency payout_frequency,
  gross_fees_day_of_month INTEGER CHECK (gross_fees_day_of_month >= 1 AND gross_fees_day_of_month <= 31),
  gross_fees_submission_delay_days INTEGER,
  gross_fees_payment_instrument_id TEXT,
  gross_fees_rail payout_rail,
  
  -- Ensure only one payout profile per merchant
  UNIQUE(merchant_id)
);

-- Enable RLS
ALTER TABLE public.merchant_payout_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own merchant payout profiles"
ON public.merchant_payout_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = merchant_payout_profiles.merchant_id
    AND merchants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own merchant payout profiles"
ON public.merchant_payout_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = merchant_payout_profiles.merchant_id
    AND merchants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own merchant payout profiles"
ON public.merchant_payout_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = merchant_payout_profiles.merchant_id
    AND merchants.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all merchant payout profiles"
ON public.merchant_payout_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "Super admins can insert merchant payout profiles"
ON public.merchant_payout_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "Super admins can update merchant payout profiles"
ON public.merchant_payout_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'superAdmin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_merchant_payout_profiles_updated_at
BEFORE UPDATE ON public.merchant_payout_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add validation trigger for type-specific fields
CREATE OR REPLACE FUNCTION validate_payout_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate NET type has required NET fields
  IF NEW.type = 'NET' THEN
    IF NEW.net_frequency IS NULL OR NEW.net_payment_instrument_id IS NULL OR NEW.net_rail IS NULL THEN
      RAISE EXCEPTION 'NET payout profiles require net_frequency, net_payment_instrument_id, and net_rail';
    END IF;
    
    -- Clear GROSS fields for NET type
    NEW.gross_payouts_frequency := NULL;
    NEW.gross_payouts_submission_delay_days := NULL;
    NEW.gross_payouts_payment_instrument_id := NULL;
    NEW.gross_payouts_rail := NULL;
    NEW.gross_fees_frequency := NULL;
    NEW.gross_fees_day_of_month := NULL;
    NEW.gross_fees_submission_delay_days := NULL;
    NEW.gross_fees_payment_instrument_id := NULL;
    NEW.gross_fees_rail := NULL;
  END IF;
  
  -- Validate GROSS type has required GROSS fields
  IF NEW.type = 'GROSS' THEN
    IF NEW.gross_payouts_frequency IS NULL OR NEW.gross_payouts_payment_instrument_id IS NULL OR NEW.gross_payouts_rail IS NULL OR
       NEW.gross_fees_frequency IS NULL OR NEW.gross_fees_payment_instrument_id IS NULL OR NEW.gross_fees_rail IS NULL THEN
      RAISE EXCEPTION 'GROSS payout profiles require all gross_payouts_* and gross_fees_* fields';
    END IF;
    
    -- Validate day_of_month for MONTHLY fees
    IF NEW.gross_fees_frequency = 'MONTHLY' AND NEW.gross_fees_day_of_month IS NULL THEN
      RAISE EXCEPTION 'MONTHLY fee frequency requires gross_fees_day_of_month';
    END IF;
    
    -- Clear NET fields for GROSS type
    NEW.net_frequency := NULL;
    NEW.net_submission_delay_days := NULL;
    NEW.net_payment_instrument_id := NULL;
    NEW.net_rail := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_payout_profile_fields_trigger
BEFORE INSERT OR UPDATE ON public.merchant_payout_profiles
FOR EACH ROW
EXECUTE FUNCTION validate_payout_profile_fields();