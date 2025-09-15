-- Fix trigger function: create_service_application_notification (use tile_id instead of service_tile_id)
CREATE OR REPLACE FUNCTION public.create_service_application_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  action_url TEXT;
  tile_title TEXT;
  application_number TEXT;
BEGIN
  -- Only create notifications for status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get service tile title for context (use NEW.tile_id)
    SELECT st.title INTO tile_title
    FROM public.municipal_service_tiles st
    WHERE st.id = NEW.tile_id;
    
    -- Get application number
    application_number := COALESCE(NEW.application_number, 'Unknown');
    
    -- Build notification content
    notification_title := 'Service Application Status Update';
    notification_message := 'Your service application #' || application_number || ' status has been updated to ' || 
                           CASE NEW.status
                             WHEN 'approved' THEN 'Approved'
                             WHEN 'denied' THEN 'Denied'
                             WHEN 'under_review' THEN 'Under Review'
                             WHEN 'information_requested' THEN 'Information Requested'
                             WHEN 'resubmitted' THEN 'Resubmitted'
                             ELSE initcap(NEW.status)
                           END;
    
    action_url := '/service-applications/' || NEW.id;
    
    -- Insert notification with unified structure
    INSERT INTO public.user_notifications (
      user_id,
      notification_type,
      title,
      message,
      service_type,
      service_number,
      update_type,
      status_change_from,
      status_change_to,
      related_entity_type,
      related_entity_id,
      action_url,
      entity_details
    ) VALUES (
      NEW.user_id,
      'service_update',
      notification_title,
      notification_message,
      'service_application',
      application_number,
      'status_change',
      OLD.status,
      NEW.status,
      'service_application',
      NEW.id,
      action_url,
      jsonb_build_object(
        'application_number', application_number,
        'service_title', COALESCE(tile_title, 'Service Application'),
        'status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix trigger function: create_communication_notification (use msa.tile_id instead of msa.service_tile_id)
CREATE OR REPLACE FUNCTION public.create_communication_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
BEGIN
  SELECT * INTO commenter_profile
  FROM public.profiles
  WHERE id = NEW.reviewer_id;

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

    SELECT jsonb_build_object(
             'permit_number', pa.permit_number,
             'permit_type', pa.permit_type,
             'status', pa.application_status
           ),
           pa.permit_number,
           pa.user_id
    INTO service_info, service_number, recipient_id
    FROM public.permit_applications pa
    WHERE pa.permit_id = NEW.permit_id;

    action_url := '/permit/' || NEW.permit_id;

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
  END IF;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  notification_title := 'New Message on ' ||
    CASE entity_type
      WHEN 'business_license' THEN 'Business License #' || service_number
      WHEN 'permit' THEN 'Permit #' || service_number
      WHEN 'service_application' THEN 'Service Application #' || service_number
    END;

  notification_message :=
    COALESCE(commenter_profile.first_name, '') || ' ' || COALESCE(commenter_profile.last_name, '') ||
    ' (' || CASE WHEN commenter_profile.account_type = 'municipal' THEN 'Municipal Staff' ELSE 'Applicant' END ||
    '): ' || NEW.comment_text;

  INSERT INTO public.user_notifications (
    user_id, notification_type, title, message,
    service_type, service_number, update_type,
    related_entity_type, related_entity_id, action_url,
    entity_details, communication_details
  ) VALUES (
    recipient_id,
    'service_update',
    notification_title,
    notification_message,
    entity_type,
    service_number,
    'communication',
    entity_type,
    entity_id,
    action_url,
    service_info,
    jsonb_build_object(
      'commenter_id', NEW.reviewer_id,
      'commenter_name', COALESCE(commenter_profile.first_name, '') || ' ' || COALESCE(commenter_profile.last_name, ''),
      'commenter_role', CASE WHEN commenter_profile.account_type = 'municipal' THEN 'Municipal Staff' ELSE 'Applicant' END,
      'comment_text', NEW.comment_text,
      'is_internal', COALESCE(NEW.is_internal, false),
      'comment_length', LENGTH(NEW.comment_text)
    )
  );

  RETURN NEW;
END;
$function$;