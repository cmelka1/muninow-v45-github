-- Fix the create_communication_notification function to handle permit_type_id
CREATE OR REPLACE FUNCTION public.create_communication_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
  action_url TEXT;
  commenter_profile public.profiles%ROWTYPE;
  service_info JSONB;
  entity_type TEXT;
  entity_id UUID;
  service_number TEXT;
  commenter_name TEXT;
BEGIN
  -- Early exit: Skip notification if comment text is NULL or empty
  IF NEW.comment_text IS NULL OR TRIM(NEW.comment_text) = '' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO commenter_profile
  FROM public.profiles
  WHERE id = NEW.reviewer_id;

  -- Determine entity type and fetch relevant information
  IF TG_TABLE_NAME = 'business_license_comments' THEN
    entity_type := 'business_license';
    entity_id := NEW.license_id;

    SELECT jsonb_build_object(
             'license_number', bla.license_number,
             'business_name', bla.business_legal_name,
             'status', bla.application_status
           ),
           bla.license_number,
           bla.user_id
    INTO service_info, service_number, recipient_id
    FROM public.business_license_applications bla
    WHERE bla.id = NEW.license_id;

    action_url := '/business-licenses/' || NEW.license_id;

  ELSIF TG_TABLE_NAME = 'permit_review_comments' THEN
    entity_type := 'permit';
    entity_id := NEW.permit_id;

    -- FIXED: Join with municipal_permit_types to get permit type name
    SELECT jsonb_build_object(
             'permit_number', pa.permit_number,
             'permit_type', COALESCE(mpt.municipal_label, 'Unknown Permit Type'),
             'status', pa.application_status
           ),
           pa.permit_number,
           pa.user_id
    INTO service_info, service_number, recipient_id
    FROM public.permit_applications pa
    LEFT JOIN public.municipal_permit_types mpt ON mpt.id = pa.permit_type_id
    WHERE pa.id = NEW.permit_id;

    action_url := '/permits/' || NEW.permit_id;

  ELSIF TG_TABLE_NAME = 'municipal_service_application_comments' THEN
    entity_type := 'service_application';
    entity_id := NEW.application_id;

    SELECT jsonb_build_object(
             'application_number', msa.application_number,
             'service_title', st.title,
             'status', msa.status
           ),
           msa.application_number,
           msa.user_id
    INTO service_info, service_number, recipient_id
    FROM public.municipal_service_applications msa
    LEFT JOIN public.municipal_service_tiles st ON st.id = msa.tile_id
    WHERE msa.id = NEW.application_id;

    action_url := '/service-applications/' || NEW.application_id;

  ELSIF TG_TABLE_NAME = 'tax_submission_comments' THEN
    entity_type := 'tax_submission';
    entity_id := NEW.submission_id;

    SELECT jsonb_build_object(
             'submission_id', ts.id,
             'tax_type', ts.tax_type,
             'status', ts.payment_status
           ),
           ts.id::text,
           ts.user_id
    INTO service_info, service_number, recipient_id
    FROM public.tax_submissions ts
    WHERE ts.id = NEW.submission_id;

    action_url := '/taxes/' || NEW.submission_id;
  END IF;

  -- Skip if recipient not found
  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build notification title with NULL-safe handling
  notification_title := 'New Message on ' ||
    CASE entity_type
      WHEN 'business_license' THEN 'Business License #' || COALESCE(service_number, 'N/A')
      WHEN 'permit' THEN 'Permit #' || COALESCE(service_number, 'N/A')
      WHEN 'service_application' THEN 'Service Application #' || COALESCE(service_number, 'N/A')
      WHEN 'tax_submission' THEN 'Tax Submission #' || COALESCE(service_number, 'N/A')
      ELSE 'Application'
    END;

  -- Build commenter name with NULL-safe CONCAT
  commenter_name := TRIM(CONCAT(
    COALESCE(commenter_profile.first_name, ''),
    ' ',
    COALESCE(commenter_profile.last_name, '')
  ));
  
  -- Use fallback if name is empty
  IF commenter_name IS NULL OR commenter_name = '' THEN
    commenter_name := 'A user';
  END IF;
  
  -- Build notification message using CONCAT (NULL-safe)
  notification_message := CONCAT(
    commenter_name,
    ' (',
    CASE 
      WHEN commenter_profile.account_type IN ('municipal', 'municipaladmin', 'municipaluser') 
      THEN 'Municipal Staff' 
      ELSE 'Applicant' 
    END,
    '): ',
    NEW.comment_text
  );

  -- Final safety check
  IF notification_message IS NULL OR TRIM(notification_message) = '' THEN
    RETURN NEW;
  END IF;

  -- Create notification
  INSERT INTO public.user_notifications (
    user_id,
    title,
    message,
    type,
    related_entity_type,
    related_entity_id,
    action_url,
    metadata
  ) VALUES (
    recipient_id,
    notification_title,
    notification_message,
    'comment',
    entity_type,
    entity_id,
    action_url,
    jsonb_build_object(
      'service_info', service_info,
      'commenter_id', NEW.reviewer_id,
      'commenter_name', commenter_name,
      'comment_preview', LEFT(NEW.comment_text, 100)
    )
  );

  RETURN NEW;
END;
$$;

-- Ensure the triggers are still in place
DO $$ 
BEGIN
  -- Trigger for permit_review_comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'permit_comment_notification_trigger' 
    AND tgrelid = 'permit_review_comments'::regclass
  ) THEN
    CREATE TRIGGER permit_comment_notification_trigger
    AFTER INSERT ON public.permit_review_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_communication_notification();
  END IF;

  -- Trigger for business_license_comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'business_license_comment_notification_trigger' 
    AND tgrelid = 'business_license_comments'::regclass
  ) THEN
    CREATE TRIGGER business_license_comment_notification_trigger
    AFTER INSERT ON public.business_license_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_communication_notification();
  END IF;

  -- Trigger for municipal_service_application_comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'service_application_comment_notification_trigger' 
    AND tgrelid = 'municipal_service_application_comments'::regclass
  ) THEN
    CREATE TRIGGER service_application_comment_notification_trigger
    AFTER INSERT ON public.municipal_service_application_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_communication_notification();
  END IF;

  -- Trigger for tax_submission_comments
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'tax_submission_comment_notification_trigger' 
    AND tgrelid = 'tax_submission_comments'::regclass
  ) THEN
    CREATE TRIGGER tax_submission_comment_notification_trigger
    AFTER INSERT ON public.tax_submission_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_communication_notification();
  END IF;
END $$;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.create_communication_notification() IS 
'Creates notifications when comments are added to various entities. Updated to use permit_type_id foreign key instead of deprecated permit_type text column.';