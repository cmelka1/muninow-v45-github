-- Create municipal_tax_types table for custom tax types configuration
CREATE TABLE public.municipal_tax_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  merchant_id UUID,
  tax_type_name TEXT NOT NULL,
  tax_type_code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  required_documents JSONB DEFAULT '[]'::jsonb,
  instructions_document_path TEXT,
  merchant_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, tax_type_code)
);

-- Enable RLS
ALTER TABLE public.municipal_tax_types ENABLE ROW LEVEL SECURITY;

-- Create policies for municipal tax types
CREATE POLICY "Municipal users can manage tax types for their customer"
  ON public.municipal_tax_types
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = municipal_tax_types.customer_id
  ));

CREATE POLICY "Public can read active municipal tax types"
  ON public.municipal_tax_types
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage all municipal tax types"
  ON public.municipal_tax_types
  FOR ALL
  USING (is_current_user_super_admin());

-- Create trigger for timestamps
CREATE TRIGGER update_municipal_tax_types_updated_at
  BEFORE UPDATE ON public.municipal_tax_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for tax instruction documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tax-instructions', 'tax-instructions', false);

-- Create policies for tax instruction documents
CREATE POLICY "Municipal users can upload tax instruction documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tax-instructions' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'municipal'
    )
  );

CREATE POLICY "Municipal users can view their tax instruction documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tax-instructions' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'municipal'
    )
  );

CREATE POLICY "Public can view tax instruction documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tax-instructions');

CREATE POLICY "Municipal users can update their tax instruction documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tax-instructions' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'municipal'
    )
  );

CREATE POLICY "Municipal users can delete their tax instruction documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tax-instructions' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.account_type = 'municipal'
    )
  );