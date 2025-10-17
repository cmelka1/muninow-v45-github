-- Migration: Service Application Renewal System
-- Add renewal capabilities matching business license renewal functionality

-- =====================================================================
-- PART 1: Add renewal fields to municipal_service_applications table
-- =====================================================================

ALTER TABLE public.municipal_service_applications
  ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_generation INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_application_id UUID REFERENCES public.municipal_service_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_issue_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS renewal_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS renewal_notified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS renewal_reminder_count INTEGER DEFAULT 0;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_service_applications_parent_application_id 
  ON public.municipal_service_applications(parent_application_id);

CREATE INDEX IF NOT EXISTS idx_service_applications_expires_at 
  ON public.municipal_service_applications(expires_at) 
  WHERE expires_at IS NOT NULL;

-- =====================================================================
-- PART 2: Create service_application_renewal_history table
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.service_application_renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_application_id UUID NOT NULL REFERENCES public.municipal_service_applications(id) ON DELETE CASCADE,
  renewed_application_id UUID NOT NULL REFERENCES public.municipal_service_applications(id) ON DELETE CASCADE,
  renewal_generation INTEGER NOT NULL,
  renewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  renewed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_renewal_pair UNIQUE(original_application_id, renewed_application_id)
);

-- Enable RLS
ALTER TABLE public.service_application_renewal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own renewal history
CREATE POLICY "Users can view their renewal history"
  ON public.service_application_renewal_history
  FOR SELECT
  USING (
    renewed_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.municipal_service_applications
      WHERE id = original_application_id AND user_id = auth.uid()
    )
  );

-- RLS Policy: Municipal users can view renewal history for their customer
CREATE POLICY "Municipal users can view renewal history for their customer"
  ON public.service_application_renewal_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.municipal_service_applications msa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE msa.id = original_application_id
        AND msa.customer_id = p.customer_id
        AND p.account_type IN ('municipal', 'municipaladmin', 'municipaluser')
    )
  );

-- RLS Policy: Super admins can view all renewal history
CREATE POLICY "Super admins can view all renewal history"
  ON public.service_application_renewal_history
  FOR SELECT
  USING (is_current_user_super_admin());

-- Performance indexes
CREATE INDEX idx_renewal_history_original_app 
  ON public.service_application_renewal_history(original_application_id);

CREATE INDEX idx_renewal_history_renewed_app 
  ON public.service_application_renewal_history(renewed_application_id);

-- =====================================================================
-- PART 3: Create expiration trigger function
-- =====================================================================

CREATE OR REPLACE FUNCTION public.set_service_application_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tile_record RECORD;
  v_interval INTERVAL;
BEGIN
  -- Only set expiration when status changes TO 'issued' from a different status
  IF NEW.status = 'issued' AND (OLD.status IS NULL OR OLD.status != 'issued') THEN
    
    -- Get the tile's renewal configuration
    SELECT is_renewable, renewal_frequency
    INTO v_tile_record
    FROM public.municipal_service_tiles
    WHERE id = NEW.tile_id;
    
    -- Only set expiration if the service is renewable
    IF v_tile_record.is_renewable = true THEN
      
      -- Determine expiration interval based on renewal frequency
      CASE v_tile_record.renewal_frequency
        WHEN 'annual' THEN
          v_interval := INTERVAL '1 year';
        WHEN 'quarterly' THEN
          v_interval := INTERVAL '3 months';
        ELSE
          v_interval := INTERVAL '1 year'; -- Default to annual
      END CASE;
      
      -- For renewals, use original_issue_date anniversary
      IF NEW.is_renewal = true AND NEW.original_issue_date IS NOT NULL THEN
        NEW.expires_at := NEW.original_issue_date + v_interval * (NEW.renewal_generation + 1);
      
      -- For new applications, set expiration from now and record original issue date
      ELSE
        NEW.original_issue_date := NOW();
        NEW.expires_at := NOW() + v_interval;
      END IF;
      
      NEW.renewal_status := 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to the table
DROP TRIGGER IF EXISTS set_service_application_expiration_trigger 
  ON public.municipal_service_applications;

CREATE TRIGGER set_service_application_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.municipal_service_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_service_application_expiration();

-- =====================================================================
-- PART 4: Create renewal RPC function
-- =====================================================================

CREATE OR REPLACE FUNCTION public.create_service_application_renewal(
  p_original_application_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_application_id UUID;
  v_original_application RECORD;
  v_tile_record RECORD;
BEGIN
  -- Get the original application details
  SELECT * INTO v_original_application
  FROM public.municipal_service_applications
  WHERE id = p_original_application_id
    AND user_id = auth.uid()
    AND status = 'issued';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original application not found, not issued, or does not belong to you';
  END IF;
  
  -- Verify the service tile is renewable
  SELECT is_renewable, renewal_frequency INTO v_tile_record
  FROM public.municipal_service_tiles
  WHERE id = v_original_application.tile_id;
  
  IF v_tile_record.is_renewable = false THEN
    RAISE EXCEPTION 'This service is not renewable';
  END IF;
  
  -- Create the renewal application with approved status
  INSERT INTO public.municipal_service_applications (
    user_id,
    customer_id,
    tile_id,
    merchant_id,
    status,
    approved_at,
    assigned_reviewer_id,
    applicant_name,
    applicant_email,
    applicant_phone,
    business_legal_name,
    street_address,
    apt_number,
    city,
    state,
    zip_code,
    country,
    base_amount_cents,
    service_specific_data,
    additional_information,
    is_renewal,
    parent_application_id,
    renewal_generation,
    original_issue_date,
    service_name,
    merchant_name,
    finix_merchant_id,
    merchant_finix_identity_id,
    merchant_fee_profile_id
  ) VALUES (
    v_original_application.user_id,
    v_original_application.customer_id,
    v_original_application.tile_id,
    v_original_application.merchant_id,
    'approved', -- Auto-approve renewals
    NOW(), -- Set approved timestamp
    v_original_application.assigned_reviewer_id,
    v_original_application.applicant_name,
    v_original_application.applicant_email,
    v_original_application.applicant_phone,
    v_original_application.business_legal_name,
    v_original_application.street_address,
    v_original_application.apt_number,
    v_original_application.city,
    v_original_application.state,
    v_original_application.zip_code,
    v_original_application.country,
    v_original_application.base_amount_cents,
    v_original_application.service_specific_data,
    v_original_application.additional_information,
    true, -- is_renewal
    p_original_application_id, -- parent_application_id
    COALESCE(v_original_application.renewal_generation, 0) + 1,
    COALESCE(v_original_application.original_issue_date, v_original_application.issued_at),
    v_original_application.service_name,
    v_original_application.merchant_name,
    v_original_application.finix_merchant_id,
    v_original_application.merchant_finix_identity_id,
    v_original_application.merchant_fee_profile_id
  )
  RETURNING id INTO v_new_application_id;
  
  -- Record the renewal in history
  INSERT INTO public.service_application_renewal_history (
    original_application_id,
    renewed_application_id,
    renewal_generation,
    renewed_by
  ) VALUES (
    p_original_application_id,
    v_new_application_id,
    COALESCE(v_original_application.renewal_generation, 0) + 1,
    auth.uid()
  );
  
  RETURN v_new_application_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_service_application_renewal(UUID) TO authenticated;