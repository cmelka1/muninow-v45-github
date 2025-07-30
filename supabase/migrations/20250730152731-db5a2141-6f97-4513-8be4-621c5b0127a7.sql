-- Update permit status timestamp trigger to handle "issued" status
CREATE OR REPLACE FUNCTION public.update_permit_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set submitted_at when status changes to submitted (already exists)
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
$function$;

-- Update permit notification trigger to handle "issued" status
CREATE OR REPLACE FUNCTION public.create_permit_status_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
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
    
    -- Insert notification
    INSERT INTO public.permit_notifications (
      permit_id,
      user_id,
      notification_type,
      title,
      message
    ) VALUES (
      NEW.permit_id,
      recipient_id,
      'status_change',
      notification_title,
      notification_message
    );
    
    -- Also notify assigned reviewer if status is submitted
    IF NEW.application_status = 'submitted' AND NEW.assigned_reviewer_id IS NOT NULL THEN
      INSERT INTO public.permit_notifications (
        permit_id,
        user_id,
        notification_type,
        title,
        message
      ) VALUES (
        NEW.permit_id,
        NEW.assigned_reviewer_id,
        'assignment',
        'New Permit Assignment',
        'You have been assigned to review permit application #' || NEW.permit_number || '.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;