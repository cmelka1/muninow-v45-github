-- Create tax backend infrastructure

-- First, create the tax_submissions table with all payment-related fields
CREATE TABLE public.tax_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  
  -- Tax submission details
  tax_type TEXT NOT NULL CHECK (tax_type IN ('food_beverage', 'hotel_motel', 'amusement')),
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  tax_period_start DATE NOT NULL,
  tax_period_end DATE NOT NULL,
  tax_year INTEGER NOT NULL,
  
  -- Payment integration fields (from process-permit-payment analysis)
  merchant_id UUID,
  finix_merchant_id TEXT,
  finix_identity_id TEXT,
  merchant_name TEXT,
  
  -- Amount tracking (in cents)
  amount_cents BIGINT NOT NULL,
  service_fee_cents BIGINT,
  total_amount_cents BIGINT NOT NULL,
  
  -- Fee structure
  basis_points INTEGER,
  fixed_fee INTEGER,
  ach_basis_points INTEGER,
  ach_fixed_fee INTEGER,
  
  -- Status tracking
  submission_status TEXT NOT NULL DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  transfer_state TEXT DEFAULT 'PENDING' CHECK (transfer_state IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  
  -- Payment processing metadata
  finix_transfer_id TEXT,
  idempotency_id TEXT UNIQUE,
  fraud_session_id TEXT,
  payment_type TEXT,
  
  -- Business categorization
  category TEXT DEFAULT 'Administrative & Civic Fees',
  subcategory TEXT,
  statement_descriptor TEXT,
  
  -- Audit and error tracking
  raw_finix_response JSONB,
  failure_code TEXT,
  failure_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Create tax_documents table
CREATE TABLE public.tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_submission_id UUID NOT NULL REFERENCES public.tax_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  
  -- File information
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('receipt', 'invoice', 'supporting_document', 'tax_return', 'other')),
  
  -- Upload tracking
  upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploaded', 'verified', 'rejected')),
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tax_calculations table for detailed breakdown
CREATE TABLE public.tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_submission_id UUID NOT NULL REFERENCES public.tax_submissions(id) ON DELETE CASCADE,
  
  -- Tax-specific calculation data stored as JSON for flexibility
  calculation_data JSONB NOT NULL,
  
  -- Common fields across tax types
  gross_receipts_cents BIGINT,
  deductions_cents BIGINT,
  taxable_receipts_cents BIGINT,
  tax_rate DECIMAL(5,4),
  tax_amount_cents BIGINT,
  commission_cents BIGINT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for tax documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tax-documents', 
  'tax-documents', 
  false, 
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif']
);

-- Enable RLS on all tables
ALTER TABLE public.tax_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_submissions
CREATE POLICY "Users can view their own tax submissions" ON public.tax_submissions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tax submissions" ON public.tax_submissions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tax submissions" ON public.tax_submissions
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Municipal users can view tax submissions for their customer" ON public.tax_submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = tax_submissions.customer_id
  )
);

CREATE POLICY "Municipal users can update tax submissions for their customer" ON public.tax_submissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = tax_submissions.customer_id
  )
);

CREATE POLICY "Super admins can manage all tax submissions" ON public.tax_submissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'superAdmin'
  )
);

CREATE POLICY "System can update tax submissions" ON public.tax_submissions
FOR UPDATE USING (true);

-- RLS Policies for tax_documents
CREATE POLICY "Users can view their own tax documents" ON public.tax_documents
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tax documents" ON public.tax_documents
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tax documents" ON public.tax_documents
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Municipal users can view tax documents for their customer" ON public.tax_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = tax_documents.customer_id
  )
);

CREATE POLICY "Super admins can manage all tax documents" ON public.tax_documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'superAdmin'
  )
);

-- RLS Policies for tax_calculations
CREATE POLICY "Users can view their own tax calculations" ON public.tax_calculations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tax_submissions ts
    WHERE ts.id = tax_calculations.tax_submission_id AND ts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own tax calculations" ON public.tax_calculations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tax_submissions ts
    WHERE ts.id = tax_calculations.tax_submission_id AND ts.user_id = auth.uid()
  )
);

CREATE POLICY "Municipal users can view tax calculations for their customer" ON public.tax_calculations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tax_submissions ts
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ts.id = tax_calculations.tax_submission_id 
    AND p.account_type = 'municipal' 
    AND p.customer_id = ts.customer_id
  )
);

CREATE POLICY "Super admins can manage all tax calculations" ON public.tax_calculations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'superAdmin'
  )
);

-- Storage RLS Policies for tax-documents bucket
CREATE POLICY "Users can view their own tax documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'tax-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own tax documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'tax-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own tax documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'tax-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own tax documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'tax-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Municipal users can view tax documents for their customer" ON storage.objects
FOR SELECT USING (
  bucket_id = 'tax-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal'
    AND profiles.customer_id::text = (storage.foldername(name))[3]
  )
);

CREATE POLICY "Super admins can manage all tax documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'tax-documents' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'superAdmin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_tax_submissions_user_id ON public.tax_submissions(user_id);
CREATE INDEX idx_tax_submissions_customer_id ON public.tax_submissions(customer_id);
CREATE INDEX idx_tax_submissions_tax_type ON public.tax_submissions(tax_type);
CREATE INDEX idx_tax_submissions_submission_status ON public.tax_submissions(submission_status);
CREATE INDEX idx_tax_submissions_payment_status ON public.tax_submissions(payment_status);
CREATE INDEX idx_tax_submissions_idempotency_id ON public.tax_submissions(idempotency_id);
CREATE INDEX idx_tax_documents_tax_submission_id ON public.tax_documents(tax_submission_id);
CREATE INDEX idx_tax_documents_user_id ON public.tax_documents(user_id);
CREATE INDEX idx_tax_calculations_tax_submission_id ON public.tax_calculations(tax_submission_id);

-- Create triggers for updating timestamps
CREATE TRIGGER update_tax_submissions_updated_at
  BEFORE UPDATE ON public.tax_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_documents_updated_at
  BEFORE UPDATE ON public.tax_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_calculations_updated_at
  BEFORE UPDATE ON public.tax_calculations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate tax calculations
CREATE OR REPLACE FUNCTION public.validate_tax_calculation(
  p_tax_type TEXT,
  p_calculation_data JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate required fields based on tax type
  CASE p_tax_type
    WHEN 'food_beverage' THEN
      RETURN (
        p_calculation_data ? 'grossSales' AND
        p_calculation_data ? 'deductions' AND
        p_calculation_data ? 'taxableReceipts' AND
        p_calculation_data ? 'tax' AND
        p_calculation_data ? 'totalDue'
      );
    WHEN 'hotel_motel' THEN
      RETURN (
        p_calculation_data ? 'netReceipts' AND
        p_calculation_data ? 'deductions' AND
        p_calculation_data ? 'taxableReceipts' AND
        p_calculation_data ? 'tax' AND
        p_calculation_data ? 'totalDue'
      );
    WHEN 'amusement' THEN
      RETURN (
        p_calculation_data ? 'netReceipts' AND
        p_calculation_data ? 'deductions' AND
        p_calculation_data ? 'taxableReceipts' AND
        p_calculation_data ? 'tax' AND
        p_calculation_data ? 'totalDue'
      );
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;