-- Create customers table for customer onboarding data
CREATE TABLE public.customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Step 1: Entity Information  
  entity_type TEXT NOT NULL,
  ownership_type TEXT NOT NULL,
  legal_entity_name TEXT NOT NULL,
  doing_business_as TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  entity_phone TEXT NOT NULL,
  entity_website TEXT,
  incorporation_date JSONB, -- {year, month, day} format for Finix
  entity_description TEXT NOT NULL,
  
  -- Business Address
  business_address_line1 TEXT NOT NULL,
  business_address_line2 TEXT,
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip_code TEXT NOT NULL,
  business_country TEXT DEFAULT 'USA',
  
  -- Step 2: Principal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  work_email TEXT NOT NULL,
  personal_phone TEXT NOT NULL,
  date_of_birth JSONB, -- {year, month, day} format for Finix
  personal_tax_id TEXT,
  ownership_percentage DECIMAL(5,2),
  
  -- Personal Address
  personal_address_line1 TEXT NOT NULL,
  personal_address_line2 TEXT,
  personal_city TEXT NOT NULL,
  personal_state TEXT NOT NULL,
  personal_zip_code TEXT NOT NULL,
  personal_country TEXT DEFAULT 'USA',
  
  -- Step 3: Processing Information
  annual_ach_volume BIGINT DEFAULT 0,
  annual_card_volume BIGINT DEFAULT 0,
  average_ach_amount BIGINT DEFAULT 0,
  average_card_amount BIGINT DEFAULT 0,
  max_ach_amount BIGINT DEFAULT 0,
  max_card_amount BIGINT DEFAULT 0,
  mcc_code TEXT NOT NULL,
  
  -- Card Volume Distribution
  card_present_percentage INTEGER DEFAULT 0,
  moto_percentage INTEGER DEFAULT 0,
  ecommerce_percentage INTEGER DEFAULT 100,
  
  -- Business Volume Distribution
  b2b_percentage INTEGER DEFAULT 0,
  b2c_percentage INTEGER DEFAULT 100,
  p2p_percentage INTEGER DEFAULT 0,
  
  -- Additional Processing Info
  has_accepted_cards_previously BOOLEAN DEFAULT false,
  refund_policy TEXT DEFAULT 'NO_REFUNDS',
  
  -- Metadata
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can view all customers" 
ON public.customers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

CREATE POLICY "Super admins can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

CREATE POLICY "Super admins can update customers" 
ON public.customers 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

CREATE POLICY "Super admins can delete customers" 
ON public.customers 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_created_at ON public.customers(created_at);
CREATE INDEX idx_customers_entity_type ON public.customers(entity_type);