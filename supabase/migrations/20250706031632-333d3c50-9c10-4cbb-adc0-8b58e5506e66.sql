-- Create customers table for Finix seller onboarding
CREATE TABLE public.customers (
  -- Core Identity & Finix Integration
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finix_identity_id TEXT NOT NULL UNIQUE,
  finix_application_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Business Information Section
  business_type TEXT NOT NULL,
  business_name TEXT NOT NULL,
  doing_business_as TEXT NOT NULL,
  business_tax_id TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  business_website TEXT NOT NULL,
  business_description TEXT NOT NULL,
  incorporation_date DATE NOT NULL,
  ownership_type TEXT NOT NULL,
  business_address_line1 TEXT NOT NULL,
  business_address_line2 TEXT,
  business_address_city TEXT NOT NULL,
  business_address_state TEXT NOT NULL,
  business_address_zip_code TEXT NOT NULL,
  business_address_country TEXT NOT NULL DEFAULT 'USA',
  
  -- Owner Information Section
  owner_first_name TEXT NOT NULL,
  owner_last_name TEXT NOT NULL,
  owner_job_title TEXT NOT NULL,
  owner_work_email TEXT NOT NULL,
  owner_personal_phone TEXT NOT NULL,
  owner_personal_address_line1 TEXT NOT NULL,
  owner_personal_address_line2 TEXT,
  owner_personal_address_city TEXT NOT NULL,
  owner_personal_address_state TEXT NOT NULL,
  owner_personal_address_zip_code TEXT NOT NULL,
  owner_personal_address_country TEXT NOT NULL DEFAULT 'USA',
  owner_date_of_birth DATE,
  owner_personal_tax_id TEXT,
  owner_ownership_percentage NUMERIC,
  
  -- Processing Information Section
  annual_ach_volume BIGINT NOT NULL DEFAULT 0,
  annual_card_volume BIGINT NOT NULL DEFAULT 0,
  average_ach_amount BIGINT NOT NULL DEFAULT 0,
  average_card_amount BIGINT NOT NULL DEFAULT 0,
  max_ach_amount BIGINT NOT NULL DEFAULT 0,
  max_card_amount BIGINT NOT NULL DEFAULT 0,
  card_present_percentage INTEGER NOT NULL DEFAULT 0,
  moto_percentage INTEGER NOT NULL DEFAULT 0,
  ecommerce_percentage INTEGER NOT NULL DEFAULT 100,
  b2b_percentage INTEGER NOT NULL DEFAULT 0,
  b2c_percentage INTEGER NOT NULL DEFAULT 100,
  p2p_percentage INTEGER NOT NULL DEFAULT 0,
  mcc_code TEXT NOT NULL,
  statement_descriptor TEXT NOT NULL,
  has_accepted_cards_previously BOOLEAN NOT NULL DEFAULT false,
  refund_policy TEXT NOT NULL,
  
  -- Legal Agreement Tracking
  merchant_agreement_accepted BOOLEAN NOT NULL,
  merchant_agreement_ip_address TEXT NOT NULL,
  merchant_agreement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  merchant_agreement_user_agent TEXT NOT NULL,
  credit_check_consent BOOLEAN NOT NULL DEFAULT false,
  credit_check_ip_address TEXT,
  credit_check_timestamp TIMESTAMP WITH TIME ZONE,
  credit_check_user_agent TEXT,
  
  -- Finix Response & Metadata Storage
  finix_raw_response JSONB,
  finix_entity_data JSONB,
  finix_tags JSONB,
  submission_metadata JSONB,
  processing_status TEXT NOT NULL DEFAULT 'submitted',
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers table
CREATE POLICY "Super admins can view all customers" 
ON public.customers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "Super admins can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "Super admins can update customers" 
ON public.customers 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);

CREATE POLICY "System can insert customers for API submissions" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_customers_finix_identity_id ON public.customers(finix_identity_id);
CREATE INDEX idx_customers_processing_status ON public.customers(processing_status);
CREATE INDEX idx_customers_verification_status ON public.customers(verification_status);
CREATE INDEX idx_customers_created_at ON public.customers(created_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();