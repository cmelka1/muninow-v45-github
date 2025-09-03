-- Create municipal_permit_types table for municipality-specific permit type customizations
CREATE TABLE public.municipal_permit_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(customer_id),
  permit_type_id UUID REFERENCES public.permit_types(id),
  merchant_id UUID REFERENCES public.merchants(id),
  merchant_name TEXT,
  municipal_label TEXT NOT NULL,
  base_fee_cents BIGINT NOT NULL DEFAULT 0,
  processing_days INTEGER DEFAULT 30,
  requires_inspection BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false, -- true if this is a completely custom type, false if based on standard
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique combination of customer, permit type, and merchant
  UNIQUE(customer_id, permit_type_id, merchant_id),
  
  -- Custom types (is_custom = true) don't need permit_type_id
  CONSTRAINT check_custom_or_standard CHECK (
    (is_custom = true AND permit_type_id IS NULL) OR 
    (is_custom = false AND permit_type_id IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE public.municipal_permit_types ENABLE ROW LEVEL SECURITY;

-- Create policies for municipal_permit_types
CREATE POLICY "Municipal users can manage permit types for their customer" 
ON public.municipal_permit_types 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.account_type = 'municipal' 
  AND profiles.customer_id = municipal_permit_types.customer_id
));

CREATE POLICY "Public can read active municipal permit types for applications" 
ON public.municipal_permit_types 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage all municipal permit types" 
ON public.municipal_permit_types 
FOR ALL 
USING (is_current_user_super_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_municipal_permit_types_updated_at
BEFORE UPDATE ON public.municipal_permit_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_municipal_permit_types_customer_id ON public.municipal_permit_types(customer_id);
CREATE INDEX idx_municipal_permit_types_merchant_id ON public.municipal_permit_types(merchant_id);
CREATE INDEX idx_municipal_permit_types_active ON public.municipal_permit_types(is_active) WHERE is_active = true;