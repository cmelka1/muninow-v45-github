-- Update the permit status notification trigger to use unified user_notifications table
CREATE OR REPLACE FUNCTION public.create_permit_status_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
        notification_message := 'Your permit application #' || NEW.permit_number || ' has been denied. Please check the details for more information.';
        recipient_id := NEW.user_id;
      WHEN 'issued' THEN
        notification_title := 'Permit Issued';
        notification_message := 'Your permit #' || NEW.permit_number || ' has been issued and you can now begin legal work.';
        recipient_id := NEW.user_id;
      ELSE
        RETURN NEW; -- No notification for other statuses
    END CASE;
    
    -- Set action URL to permit detail page
    action_url := '/permit/' || NEW.permit_id;
    
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
      'permit_status_change',
      notification_title,
      notification_message,
      'permit',
      NEW.permit_id,
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
        'permit_assignment',
        'New Permit Assignment',
        'You have been assigned to review permit application #' || NEW.permit_number || '.',
        'permit',
        NEW.permit_id,
        action_url
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;