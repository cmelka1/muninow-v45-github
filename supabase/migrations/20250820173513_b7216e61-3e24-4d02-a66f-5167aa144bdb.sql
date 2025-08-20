-- Create business license status enum
CREATE TYPE business_license_status_enum AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'information_requested',
  'resubmitted',
  'approved',
  'denied',
  'withdrawn',
  'expired',
  'issued'
);

-- Create business license types table
CREATE TABLE public.business_license_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_fee_cents BIGINT NOT NULL DEFAULT 0,
  processing_days INTEGER DEFAULT 30,
  requires_inspection BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create business license applications table
CREATE TABLE public.business_license_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number TEXT UNIQUE,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  merchant_id UUID,
  license_type_id UUID REFERENCES public.business_license_types(id),
  
  -- Application status and workflow
  application_status business_license_status_enum DEFAULT 'draft',
  assigned_reviewer_id UUID,
  
  -- Business information from form
  business_legal_name TEXT NOT NULL,
  doing_business_as TEXT,
  business_type TEXT NOT NULL,
  business_description TEXT,
  federal_ein TEXT,
  state_tax_id TEXT,
  
  -- Business address
  business_street_address TEXT NOT NULL,
  business_apt_number TEXT,
  business_city TEXT NOT NULL,
  business_state TEXT NOT NULL,
  business_zip_code TEXT NOT NULL,
  business_country TEXT DEFAULT 'USA',
  
  -- Contact information
  business_phone TEXT,
  business_email TEXT,
  
  -- Owner information
  owner_first_name TEXT NOT NULL,
  owner_last_name TEXT NOT NULL,
  owner_title TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  
  -- Owner address
  owner_street_address TEXT NOT NULL,
  owner_apt_number TEXT,
  owner_city TEXT NOT NULL,
  owner_state TEXT NOT NULL,
  owner_zip_code TEXT NOT NULL,
  owner_country TEXT DEFAULT 'USA',
  
  -- Payment and fee information
  base_fee_cents BIGINT DEFAULT 0,
  total_fee_cents BIGINT DEFAULT 0,
  service_fee_cents BIGINT DEFAULT 0,
  total_amount_cents BIGINT DEFAULT 0,
  
  -- Finix payment integration
  finix_merchant_id TEXT,
  merchant_finix_identity_id TEXT,
  merchant_fee_profile_id TEXT,
  finix_fee_profile_id TEXT,
  
  -- Payment processing fields
  idempotency_id TEXT,
  fraud_session_id TEXT,
  payment_type TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  transfer_state TEXT DEFAULT 'PENDING',
  
  -- Additional form data
  additional_info JSONB DEFAULT '{}',
  form_responses JSONB DEFAULT '{}',
  
  -- Review and workflow timestamps
  submitted_at TIMESTAMPTZ,
  under_review_at TIMESTAMPTZ,
  information_requested_at TIMESTAMPTZ,
  resubmitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  
  -- Review information
  review_notes TEXT,
  denial_reason TEXT,
  reviewer_comments TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create business license documents table
CREATE TABLE public.business_license_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.business_license_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  merchant_id UUID,
  merchant_name TEXT,
  file_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add business_license_id to payment_history table
ALTER TABLE public.payment_history 
ADD COLUMN business_license_id UUID REFERENCES public.business_license_applications(id);

-- Create storage bucket for business license documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-license-documents',
  'business-license-documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- Enable RLS on all tables
ALTER TABLE public.business_license_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_license_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_license_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_license_types
CREATE POLICY "Municipal users can manage license types for their customer"
  ON public.business_license_types
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = business_license_types.customer_id
  ));

CREATE POLICY "Public can read active license types"
  ON public.business_license_types
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage all license types"
  ON public.business_license_types
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'superAdmin'
  ));

-- RLS Policies for business_license_applications
CREATE POLICY "Users can insert their own license applications"
  ON public.business_license_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own license applications"
  ON public.business_license_applications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own draft applications"
  ON public.business_license_applications
  FOR UPDATE
  USING (user_id = auth.uid() AND application_status = 'draft');

CREATE POLICY "Municipal users can view applications for their customer"
  ON public.business_license_applications
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = business_license_applications.customer_id
  ));

CREATE POLICY "Municipal users can update applications for their customer"
  ON public.business_license_applications
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = business_license_applications.customer_id
  ));

CREATE POLICY "Super admins can manage all applications"
  ON public.business_license_applications
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'superAdmin'
  ));

-- RLS Policies for business_license_documents
CREATE POLICY "Users can insert documents for their own applications"
  ON public.business_license_documents
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view documents for their own applications"
  ON public.business_license_documents
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Municipal users can view documents for their customer applications"
  ON public.business_license_documents
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'municipal' 
    AND profiles.customer_id = business_license_documents.customer_id
  ));

CREATE POLICY "Super admins can manage all documents"
  ON public.business_license_documents
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'superAdmin'
  ));

-- Storage policies for business-license-documents bucket
CREATE POLICY "Users can upload documents for their applications"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'business-license-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own license documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'business-license-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Municipal users can view documents for their customer"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'business-license-documents' 
    AND EXISTS (
      SELECT 1 FROM public.business_license_documents bld
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE bld.storage_path = name
      AND p.account_type = 'municipal'
      AND p.customer_id = bld.customer_id
    )
  );

-- Function to generate license numbers
CREATE OR REPLACE FUNCTION public.generate_license_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := EXTRACT(year FROM now())::TEXT;
  
  SELECT 'BL-' || year_suffix || '-' || LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO new_number
  FROM public.business_license_applications
  WHERE EXTRACT(year FROM created_at) = EXTRACT(year FROM now());
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set license number
CREATE OR REPLACE FUNCTION public.set_license_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.license_number IS NULL THEN
    NEW.license_number := public.generate_license_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_license_number_trigger
  BEFORE INSERT ON public.business_license_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_license_number();

-- Trigger to update timestamps on status changes
CREATE OR REPLACE FUNCTION public.update_license_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set submitted_at when status changes to submitted
  IF NEW.application_status = 'submitted' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.submitted_at = NOW();
  END IF;
  
  -- Set under_review_at when status changes to under_review
  IF NEW.application_status = 'under_review' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.under_review_at = NOW();
  END IF;
  
  -- Set information_requested_at when status changes to information_requested
  IF NEW.application_status = 'information_requested' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.information_requested_at = NOW();
  END IF;
  
  -- Set resubmitted_at when status changes to resubmitted
  IF NEW.application_status = 'resubmitted' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.resubmitted_at = NOW();
  END IF;
  
  -- Set approved_at when status changes to approved
  IF NEW.application_status = 'approved' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.approved_at = NOW();
  END IF;
  
  -- Set denied_at when status changes to denied
  IF NEW.application_status = 'denied' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.denied_at = NOW();
  END IF;
  
  -- Set withdrawn_at when status changes to withdrawn
  IF NEW.application_status = 'withdrawn' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.withdrawn_at = NOW();
  END IF;
  
  -- Set expired_at when status changes to expired
  IF NEW.application_status = 'expired' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.expired_at = NOW();
  END IF;
  
  -- Set issued_at when status changes to issued
  IF NEW.application_status = 'issued' AND OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    NEW.issued_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_license_status_timestamps_trigger
  BEFORE UPDATE ON public.business_license_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_license_status_timestamps();

-- Trigger for updated_at timestamps
CREATE TRIGGER update_business_license_types_updated_at
  BEFORE UPDATE ON public.business_license_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_license_applications_updated_at
  BEFORE UPDATE ON public.business_license_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_license_documents_updated_at
  BEFORE UPDATE ON public.business_license_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger for status changes
CREATE OR REPLACE FUNCTION public.create_license_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
  action_url TEXT;
BEGIN
  -- Only create notifications on status changes
  IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    -- Set notification content based on new status
    CASE NEW.application_status
      WHEN 'submitted' THEN
        notification_title := 'Business License Application Submitted';
        notification_message := 'Your business license application #' || NEW.license_number || ' has been submitted successfully.';
        recipient_id := NEW.user_id;
      WHEN 'under_review' THEN
        notification_title := 'License Under Review';
        notification_message := 'Your business license application #' || NEW.license_number || ' is now under review.';
        recipient_id := NEW.user_id;
      WHEN 'information_requested' THEN
        notification_title := 'Additional Information Requested';
        notification_message := 'Additional information has been requested for license #' || NEW.license_number || '.';
        recipient_id := NEW.user_id;
      WHEN 'approved' THEN
        notification_title := 'License Approved';
        notification_message := 'Congratulations! Your business license application #' || NEW.license_number || ' has been approved.';
        recipient_id := NEW.user_id;
      WHEN 'denied' THEN
        notification_title := 'License Denied';
        notification_message := 'Your business license application #' || NEW.license_number || ' has been denied. Please check the details for more information.';
        recipient_id := NEW.user_id;
      WHEN 'issued' THEN
        notification_title := 'License Issued';
        notification_message := 'Your business license #' || NEW.license_number || ' has been issued and is now active.';
        recipient_id := NEW.user_id;
      ELSE
        RETURN NEW; -- No notification for other statuses
    END CASE;
    
    -- Set action URL to license detail page
    action_url := '/business-licenses/' || NEW.id;
    
    -- Insert notification into unified user_notifications table
    INSERT INTO public.user_notifications (
      user_id,
      notification_type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url
    ) VALUES (
      recipient_id,
      'license_status_change',
      notification_title,
      notification_message,
      'business_license',
      NEW.id,
      action_url
    );
    
    -- Also notify assigned reviewer if status is submitted
    IF NEW.application_status = 'submitted' AND NEW.assigned_reviewer_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (
        user_id,
        notification_type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        action_url
      ) VALUES (
        NEW.assigned_reviewer_id,
        'license_assignment',
        'New License Assignment',
        'You have been assigned to review business license application #' || NEW.license_number || '.',
        'business_license',
        NEW.id,
        action_url
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_license_status_notification_trigger
  AFTER UPDATE ON public.business_license_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_license_status_notification();