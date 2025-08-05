-- Phase 1A: Add Critical Database Indexes for Permit Performance

-- Index for permit_applications queries by customer_id (most common filter)
CREATE INDEX IF NOT EXISTS idx_permit_applications_customer_id 
ON permit_applications(customer_id);

-- Composite index for municipal permit queries (customer_id + status + created_at)
CREATE INDEX IF NOT EXISTS idx_permit_applications_customer_status_created 
ON permit_applications(customer_id, application_status, created_at DESC);

-- Index for permit lookups by permit_id (primary lookup)
CREATE INDEX IF NOT EXISTS idx_permit_applications_permit_id 
ON permit_applications(permit_id);

-- Index for assigned reviewer queries
CREATE INDEX IF NOT EXISTS idx_permit_applications_assigned_reviewer 
ON permit_applications(assigned_reviewer_id) 
WHERE assigned_reviewer_id IS NOT NULL;

-- Index for permit_types table queries
CREATE INDEX IF NOT EXISTS idx_permit_types_active 
ON permit_types(is_active, name) 
WHERE is_active = true;

-- Index for municipal_permit_questions queries
CREATE INDEX IF NOT EXISTS idx_municipal_permit_questions_customer_active 
ON municipal_permit_questions(customer_id, is_active, display_order) 
WHERE is_active = true;

-- Index for permit_documents queries
CREATE INDEX IF NOT EXISTS idx_permit_documents_permit_id 
ON permit_documents(permit_id);

-- Phase 1B: Create Optimized Database Function for Permit Details

CREATE OR REPLACE FUNCTION public.get_permit_with_details(p_permit_id uuid)
RETURNS TABLE(
  -- Permit application fields
  permit_id uuid,
  permit_number text,
  permit_type text,
  application_status text,
  applicant_full_name text,
  applicant_email text,
  applicant_phone text,
  property_address text,
  property_apt_number text,
  property_city text,
  property_state text,
  property_zip_code text,
  project_description text,
  estimated_construction_value_cents bigint,
  total_amount_cents bigint,
  created_at timestamp with time zone,
  submitted_at timestamp with time zone,
  under_review_at timestamp with time zone,
  information_requested_at timestamp with time zone,
  approved_at timestamp with time zone,
  denied_at timestamp with time zone,
  issued_at timestamp with time zone,
  withdrawn_at timestamp with time zone,
  expired_at timestamp with time zone,
  resubmitted_at timestamp with time zone,
  user_id uuid,
  customer_id uuid,
  merchant_id uuid,
  merchant_name text,
  assigned_reviewer_id uuid,
  review_notes text,
  municipal_questions_responses jsonb,
  -- Permit type fields
  base_fee_cents bigint,
  processing_days integer,
  requires_inspection boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pa.permit_id,
    pa.permit_number,
    pa.permit_type,
    pa.application_status,
    pa.applicant_full_name,
    pa.applicant_email,
    pa.applicant_phone,
    pa.property_address,
    pa.property_apt_number,
    pa.property_city,
    pa.property_state,
    pa.property_zip_code,
    pa.project_description,
    pa.estimated_construction_value_cents,
    pa.total_amount_cents,
    pa.created_at,
    pa.submitted_at,
    pa.under_review_at,
    pa.information_requested_at,
    pa.approved_at,
    pa.denied_at,
    pa.issued_at,
    pa.withdrawn_at,
    pa.expired_at,
    pa.resubmitted_at,
    pa.user_id,
    pa.customer_id,
    pa.merchant_id,
    pa.merchant_name,
    pa.assigned_reviewer_id,
    pa.review_notes,
    pa.municipal_questions_responses,
    pt.base_fee_cents,
    pt.processing_days,
    pt.requires_inspection
  FROM permit_applications pa
  LEFT JOIN permit_types pt ON pt.name = pa.permit_type
  WHERE pa.permit_id = p_permit_id;
END;
$function$;