
-- Create merchant fee profiles table
CREATE TABLE public.merchant_fee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  merchant_name TEXT,
  finix_merchant_id TEXT,
  finix_merchant_profile_id TEXT,
  finix_fee_profile_id TEXT,
  finix_application_id TEXT,
  
  -- Core fee fields (9 main fields from API)
  ach_basis_points INTEGER,
  ach_basis_points_fee_limit INTEGER,
  ach_fixed_fee INTEGER,
  basis_points INTEGER,
  fixed_fee INTEGER,
  ach_credit_return_fixed_fee INTEGER,
  ach_debit_return_fixed_fee INTEGER,
  dispute_fixed_fee INTEGER,
  dispute_inquiry_fixed_fee INTEGER,
  
  -- Additional fields from Finix response
  american_express_assessment_basis_points INTEGER,
  american_express_basis_points INTEGER,
  american_express_charge_interchange BOOLEAN,
  american_express_externally_funded_basis_points INTEGER,
  american_express_externally_funded_fixed_fee INTEGER,
  american_express_fixed_fee INTEGER,
  
  charge_interchange BOOLEAN,
  qualified_tiers TEXT,
  rounding_mode TEXT,
  tags JSONB DEFAULT '{}',
  
  -- API response storage for audit
  finix_raw_response JSONB,
  merchant_profile_raw_response JSONB,
  
  -- Metadata
  sync_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.merchant_fee_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for Super Admins (full CRUD access)
CREATE POLICY "Super admins can view all merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

CREATE POLICY "Super admins can insert merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

CREATE POLICY "Super admins can update merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

CREATE POLICY "Super admins can delete merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

-- Create policies for Merchants (read-only access to their own)
CREATE POLICY "Users can view their own merchant fee profiles" 
ON public.merchant_fee_profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM merchants 
  WHERE merchants.id = merchant_fee_profiles.merchant_id 
  AND merchants.user_id = auth.uid()
));

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_merchant_fee_profiles_updated_at
  BEFORE UPDATE ON public.merchant_fee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraint to merchants table
ALTER TABLE public.merchant_fee_profiles 
ADD CONSTRAINT merchant_fee_profiles_merchant_id_fkey 
FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_merchant_fee_profiles_merchant_id ON public.merchant_fee_profiles(merchant_id);
CREATE INDEX idx_merchant_fee_profiles_finix_fee_profile_id ON public.merchant_fee_profiles(finix_fee_profile_id);
