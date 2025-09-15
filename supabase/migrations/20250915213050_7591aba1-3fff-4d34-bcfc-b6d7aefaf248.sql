-- Update service application notification trigger to use unified notification structure
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
    -- Get service tile title for context
    SELECT st.title INTO tile_title
    FROM public.municipal_service_tiles st
    WHERE st.id = NEW.service_tile_id;
    
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