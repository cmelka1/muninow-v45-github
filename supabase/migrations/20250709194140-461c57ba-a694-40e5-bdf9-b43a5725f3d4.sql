-- Create merchant fee profiles table
CREATE TABLE public.merchant_fee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  finix_fee_profile_id TEXT UNIQUE,
  
  -- Basic fee configuration
  ach_basis_points INTEGER DEFAULT 0,
  ach_basis_points_fee_limit INTEGER,
  ach_fixed_fee INTEGER DEFAULT 0,
  basis_points INTEGER DEFAULT 0,
  fixed_fee INTEGER DEFAULT 0,
  
  -- ACH return fees
  ach_credit_return_fixed_fee INTEGER DEFAULT 0,
  ach_debit_return_fixed_fee INTEGER DEFAULT 0,
  
  -- Dispute fees
  dispute_fixed_fee INTEGER DEFAULT 0,
  dispute_inquiry_fixed_fee INTEGER DEFAULT 0,
  
  -- American Express fees
  american_express_assessment_basis_points INTEGER,
  american_express_basis_points INTEGER,
  american_express_charge_interchange BOOLEAN,
  american_express_externally_funded_basis_points INTEGER,
  american_express_externally_funded_fixed_fee INTEGER,
  american_express_fixed_fee INTEGER,
  
  -- Ancillary fees
  ancillary_fixed_fee_primary INTEGER,
  ancillary_fixed_fee_secondary INTEGER,
  
  -- Diners Club fees
  diners_club_basis_points INTEGER,
  diners_club_charge_interchange BOOLEAN,
  diners_club_fixed_fee INTEGER,
  
  -- Discover fees
  discover_assessments_basis_points INTEGER,
  discover_basis_points INTEGER,
  discover_charge_interchange BOOLEAN,
  discover_data_usage_fixed_fee INTEGER,
  discover_externally_funded_basis_points INTEGER,
  discover_externally_funded_fixed_fee INTEGER,
  discover_fixed_fee INTEGER,
  discover_network_authorization_fixed_fee INTEGER,
  
  -- External funding fees
  externally_funded_basis_points INTEGER,
  externally_funded_fixed_fee INTEGER,
  
  -- JCB fees
  jcb_basis_points INTEGER,
  jcb_charge_interchange BOOLEAN,
  jcb_fixed_fee INTEGER,
  
  -- Mastercard fees
  mastercard_acquirer_fees_basis_points INTEGER,
  mastercard_assessments_over1k_basis_points INTEGER,
  mastercard_assessments_under1k_basis_points INTEGER,
  mastercard_basis_points INTEGER,
  mastercard_charge_interchange BOOLEAN,
  mastercard_fixed_fee INTEGER,
  
  -- Visa fees
  visa_acquirer_processing_fixed_fee INTEGER,
  visa_assessments_basis_points INTEGER,
  visa_base_ii_credit_voucher_fixed_fee INTEGER,
  visa_base_ii_system_file_transmission_fixed_fee INTEGER,
  visa_basis_points INTEGER,
  visa_charge_interchange BOOLEAN,
  visa_credit_voucher_fixed_fee INTEGER,
  visa_fixed_fee INTEGER,
  visa_kilobyte_access_fixed_fee INTEGER,
  
  -- Configuration
  charge_interchange BOOLEAN DEFAULT false,
  qualified_tiers TEXT,
  rounding_mode TEXT DEFAULT 'TRANSACTION',
  
  -- Sync status and metadata
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  finix_application_id TEXT,
  finix_raw_response JSONB,
  tags JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one fee profile per merchant
  UNIQUE(merchant_id)
);

-- Enable RLS
ALTER TABLE public.merchant_fee_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for SuperAdmin only
CREATE POLICY "SuperAdmins can view all fee profiles"
ON public.merchant_fee_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "SuperAdmins can insert fee profiles"
ON public.merchant_fee_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "SuperAdmins can update fee profiles"
ON public.merchant_fee_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "SuperAdmins can delete fee profiles"
ON public.merchant_fee_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_merchant_fee_profiles_merchant_id ON public.merchant_fee_profiles(merchant_id);
CREATE INDEX idx_merchant_fee_profiles_finix_id ON public.merchant_fee_profiles(finix_fee_profile_id);
CREATE INDEX idx_merchant_fee_profiles_sync_status ON public.merchant_fee_profiles(sync_status);

-- Create trigger for updated_at
CREATE TRIGGER update_merchant_fee_profiles_updated_at
  BEFORE UPDATE ON public.merchant_fee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();