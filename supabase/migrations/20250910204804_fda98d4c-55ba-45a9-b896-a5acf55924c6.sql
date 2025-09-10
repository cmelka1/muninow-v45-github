-- Ensure paperless_billing column exists in user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS paperless_billing BOOLEAN DEFAULT false;

-- Update existing business license status function to use new schema
CREATE OR REPLACE FUNCTION public.create_license_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
  action_url TEXT;
  license_info JSONB;
BEGIN
  -- Only create notifications on status changes
  IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    -- Get license information
    SELECT jsonb_build_object(
      'license_number', NEW.license_number,
      'business_name', NEW.business_legal_name,
      'customer_name', c.legal_entity_name
    ) INTO license_info
    FROM public.customers c
    WHERE c.customer_id = NEW.customer_id;
    
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
    
    -- Insert unified notification
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
      recipient_id,
      'service_update',
      notification_title,
      notification_message,
      'business_license',
      NEW.license_number,
      'status_change',
      OLD.application_status,
      NEW.application_status,
      'business_license',
      NEW.id,
      action_url,
      license_info
    );
    
    -- Also notify assigned reviewer if status is submitted
    IF NEW.application_status = 'submitted' AND NEW.assigned_reviewer_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (
        user_id,
        notification_type,
        title,
        message,
        service_type,
        service_number,
        update_type,
        related_entity_type,
        related_entity_id,
        action_url,
        entity_details
      ) VALUES (
        NEW.assigned_reviewer_id,
        'service_update',
        'New License Assignment',
        'You have been assigned to review business license application #' || NEW.license_number || '.',
        'business_license',
        NEW.license_number,
        'assignment',
        'business_license',
        NEW.id,
        action_url,
        license_info
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';