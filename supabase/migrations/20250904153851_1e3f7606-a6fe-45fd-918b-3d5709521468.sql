-- Create the municipal_business_license_types table
CREATE TABLE public.municipal_business_license_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  business_license_type_id UUID NULL, -- Reference to standard business_license_types
  merchant_id UUID NULL,
  merchant_name TEXT NULL,
  municipal_label TEXT NOT NULL,
  base_fee_cents BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.municipal_business_license_types ENABLE ROW LEVEL SECURITY;

-- Create policies for municipal business license types
CREATE POLICY "Municipal users can manage their customer license types" 
ON public.municipal_business_license_types 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.account_type = 'municipal' 
  AND profiles.customer_id = municipal_business_license_types.customer_id
));

CREATE POLICY "Public can read active municipal license types" 
ON public.municipal_business_license_types 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage all municipal license types" 
ON public.municipal_business_license_types 
FOR ALL 
USING (is_current_user_super_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_municipal_business_license_types_updated_at
BEFORE UPDATE ON public.municipal_business_license_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get municipal business license types
CREATE OR REPLACE FUNCTION public.get_municipal_business_license_types(p_customer_id UUID)
RETURNS TABLE(
  id UUID,
  customer_id UUID,
  business_license_type_id UUID,
  merchant_id UUID,
  merchant_name TEXT,
  municipal_label TEXT,
  base_fee_cents BIGINT,
  is_active BOOLEAN,
  is_custom BOOLEAN,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mblt.id,
    mblt.customer_id,
    mblt.business_license_type_id,
    mblt.merchant_id,
    mblt.merchant_name,
    mblt.municipal_label,
    mblt.base_fee_cents,
    mblt.is_active,
    mblt.is_custom,
    mblt.display_order,
    mblt.created_at,
    mblt.updated_at
  FROM public.municipal_business_license_types mblt
  WHERE mblt.customer_id = p_customer_id
    AND mblt.is_active = true
  ORDER BY mblt.display_order, mblt.municipal_label;
END;
$$;

-- Create function to create municipal business license type (fixed parameter ordering)
CREATE OR REPLACE FUNCTION public.create_municipal_business_license_type(
  p_customer_id UUID,
  p_municipal_label TEXT,
  p_base_fee_cents BIGINT,
  p_business_license_type_id UUID DEFAULT NULL,
  p_merchant_id UUID DEFAULT NULL,
  p_merchant_name TEXT DEFAULT NULL,
  p_is_custom BOOLEAN DEFAULT true,
  p_display_order INTEGER DEFAULT 999
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.municipal_business_license_types (
    customer_id,
    business_license_type_id,
    merchant_id,
    merchant_name,
    municipal_label,
    base_fee_cents,
    is_custom,
    display_order
  ) VALUES (
    p_customer_id,
    p_business_license_type_id,
    p_merchant_id,
    p_merchant_name,
    p_municipal_label,
    p_base_fee_cents,
    p_is_custom,
    p_display_order
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create function to update municipal business license type
CREATE OR REPLACE FUNCTION public.update_municipal_business_license_type(
  p_id UUID,
  p_municipal_label TEXT DEFAULT NULL,
  p_base_fee_cents BIGINT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_display_order INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.municipal_business_license_types
  SET 
    municipal_label = COALESCE(p_municipal_label, municipal_label),
    base_fee_cents = COALESCE(p_base_fee_cents, base_fee_cents),
    is_active = COALESCE(p_is_active, is_active),
    display_order = COALESCE(p_display_order, display_order),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to initialize standard business license types for a municipality
CREATE OR REPLACE FUNCTION public.initialize_standard_business_license_types(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merchant_record RECORD;
BEGIN
  -- Get the business licenses merchant for this customer
  SELECT id, merchant_name INTO merchant_record
  FROM public.merchants 
  WHERE customer_id = p_customer_id 
    AND subcategory = 'Business Licenses'
  LIMIT 1;
  
  -- If no merchant found, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Insert standard business license types from business_license_types table
  INSERT INTO public.municipal_business_license_types (
    customer_id,
    business_license_type_id,
    merchant_id,
    merchant_name,
    municipal_label,
    base_fee_cents,
    is_custom,
    display_order
  )
  SELECT 
    p_customer_id,
    blt.id,
    merchant_record.id,
    merchant_record.merchant_name,
    blt.name,
    blt.base_fee_cents,
    false, -- Not custom since they're standard types
    ROW_NUMBER() OVER (ORDER BY blt.name) - 1
  FROM public.business_license_types blt
  WHERE blt.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.municipal_business_license_types mblt
      WHERE mblt.customer_id = p_customer_id
        AND mblt.business_license_type_id = blt.id
    );
  
  RETURN TRUE;
END;
$$;