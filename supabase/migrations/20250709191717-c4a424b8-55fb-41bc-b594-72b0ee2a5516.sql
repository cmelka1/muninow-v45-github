-- Create enum for sync status
CREATE TYPE fee_profile_sync_status AS ENUM ('pending', 'synced', 'error');

-- Create merchant_fee_profiles table
CREATE TABLE public.merchant_fee_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL UNIQUE,
  finix_fee_profile_id TEXT NULL,
  finix_application_id TEXT NULL,
  
  -- Core card processing fees (in basis points and cents)
  basis_points INTEGER NOT NULL DEFAULT 290,
  fixed_fee INTEGER NOT NULL DEFAULT 30,
  
  -- ACH processing fees
  ach_basis_points INTEGER NOT NULL DEFAULT 20,
  ach_fixed_fee INTEGER NOT NULL DEFAULT 30,
  ach_basis_points_fee_limit INTEGER NULL DEFAULT 500,
  
  -- Return fees (in cents)
  ach_credit_return_fixed_fee INTEGER NOT NULL DEFAULT 0,
  ach_debit_return_fixed_fee INTEGER NOT NULL DEFAULT 0,
  
  -- Dispute fees (in cents)
  dispute_fixed_fee INTEGER NOT NULL DEFAULT 1500,
  dispute_inquiry_fixed_fee INTEGER NOT NULL DEFAULT 1500,
  
  -- Sync metadata
  sync_status fee_profile_sync_status NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraint
  CONSTRAINT fk_merchant_fee_profiles_merchant 
    FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.merchant_fee_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only superadmins can manage fee profiles
CREATE POLICY "Super admins can view all merchant fee profiles"
  ON public.merchant_fee_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'superAdmin'
    )
  );

CREATE POLICY "Super admins can insert merchant fee profiles"
  ON public.merchant_fee_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'superAdmin'
    )
  );

CREATE POLICY "Super admins can update merchant fee profiles"
  ON public.merchant_fee_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'superAdmin'
    )
  );

CREATE POLICY "Super admins can delete merchant fee profiles"
  ON public.merchant_fee_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'superAdmin'
    )
  );

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_merchant_fee_profiles_updated_at
  BEFORE UPDATE ON public.merchant_fee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_merchant_fee_profiles_merchant_id 
  ON public.merchant_fee_profiles(merchant_id);

CREATE INDEX idx_merchant_fee_profiles_sync_status 
  ON public.merchant_fee_profiles(sync_status);