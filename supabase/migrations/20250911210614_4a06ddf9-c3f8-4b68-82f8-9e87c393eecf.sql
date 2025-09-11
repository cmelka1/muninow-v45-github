-- Fix: permit status notification (remove permit_type_id usage)
CREATE OR REPLACE FUNCTION public.create_permit_status_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
  action_url TEXT;
  permit_info JSONB;
BEGIN
  IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    -- Build permit info without joining permit_types
    SELECT jsonb_build_object(
      'permit_number', NEW.permit_number,
      'permit_type', NEW.permit_type,
      'customer_name', c.legal_entity_name
    )
    INTO permit_info
    FROM public.customers c
    WHERE c.customer_id = NEW.customer_id;

    -- Choose message based on status
    CASE NEW.application_status
      WHEN 'submitted' THEN
        notification_title := 'Permit Application Submitted';
        notification_message := 'Your permit application #' || NEW.permit_number || ' has been submitted successfully.';
        recipient_id := NEW.user_id;
      WHEN 'under_review' THEN
        notification_title := 'Permit Under Review';
        notification_message := 'Your permit application #' || NEW.permit_number || ' is now under review.';
        recipient_id := NEW.user_id;
      WHEN 'information_requested' THEN
        notification_title := 'Additional Information Requested';
        notification_message := 'Additional information has been requested for permit #' || NEW.permit_number || '.';
        recipient_id := NEW.user_id;
      WHEN 'approved' THEN
        notification_title := 'Permit Approved';
        notification_message := 'Congratulations! Your permit application #' || NEW.permit_number || ' has been approved.';
        recipient_id := NEW.user_id;
      WHEN 'denied' THEN
        notification_title := 'Permit Denied';
        notification_message := 'Your permit application #' || NEW.permit_number || ' has been denied. Please check the details.';
        recipient_id := NEW.user_id;
      WHEN 'issued' THEN
        notification_title := 'Permit Issued';
        notification_message := 'Your permit #' || NEW.permit_number || ' has been issued and you can now begin legal work.';
        recipient_id := NEW.user_id;
      ELSE
        RETURN NEW;
    END CASE;

    action_url := '/permit/' || NEW.permit_id;

    INSERT INTO public.user_notifications (
      user_id, notification_type, title, message,
      service_type, service_number, update_type,
      status_change_from, status_change_to,
      related_entity_type, related_entity_id, action_url, entity_details
    ) VALUES (
      recipient_id,
      'service_update',
      notification_title,
      notification_message,
      'permit',
      NEW.permit_number,
      'status_change',
      OLD.application_status,
      NEW.application_status,
      'permit',
      NEW.permit_id,
      action_url,
      permit_info
    );

    IF NEW.application_status = 'submitted' AND NEW.assigned_reviewer_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (
        user_id, notification_type, title, message,
        service_type, service_number, update_type,
        related_entity_type, related_entity_id, action_url, entity_details
      ) VALUES (
        NEW.assigned_reviewer_id,
        'service_update',
        'New Permit Assignment',
        'You have been assigned to review permit application #' || NEW.permit_number || '.',
        'permit',
        NEW.permit_number,
        'assignment',
        'permit',
        NEW.permit_id,
        action_url,
        permit_info
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix: communication notification (remove join to permit_types)
CREATE OR REPLACE FUNCTION public.create_communication_notification()
RETURNS TRIGGER
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
    LEFT JOIN public.municipal_service_tiles st ON st.id = msa.service_tile_id
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