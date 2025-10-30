-- ========================================
-- Part 1: Harden Business License Status Notification
-- ========================================
CREATE OR REPLACE FUNCTION public.create_license_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  action_url TEXT;
  license_type_name TEXT;
BEGIN
  -- Only create notifications for status changes
  IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    
    -- Get license type name
    SELECT name INTO license_type_name
    FROM public.business_license_types_v2
    WHERE id = NEW.license_type_id;
    
    -- Build notification content based on status
    CASE NEW.application_status
      WHEN 'submitted' THEN
        notification_title := 'Application Submitted';
        notification_message := CONCAT(
          'Your business license application #',
          COALESCE(NEW.license_number, 'Pending'),
          ' has been submitted successfully.'
        );
      
      WHEN 'under_review' THEN
        notification_title := 'Application Under Review';
        notification_message := CONCAT(
          'Your business license application #',
          COALESCE(NEW.license_number, 'Pending'),
          ' is now under review.'
        );
      
      WHEN 'information_requested' THEN
        notification_title := 'Information Requested';
        notification_message := CONCAT(
          'Additional information is needed for your business license application #',
          COALESCE(NEW.license_number, 'Pending'),
          '. Please check your application for details.'
        );
      
      WHEN 'approved' THEN
        notification_title := 'Application Approved';
        notification_message := CONCAT(
          'Congratulations! Your business license application #',
          COALESCE(NEW.license_number, 'Pending'),
          ' has been approved.'
        );
      
      WHEN 'denied' THEN
        notification_title := 'Application Denied';
        notification_message := CONCAT(
          'Your business license application #',
          COALESCE(NEW.license_number, 'Pending'),
          ' has been denied. Please review the details for more information.'
        );
      
      WHEN 'issued' THEN
        notification_title := 'License Issued';
        notification_message := CONCAT(
          'Your business license #',
          COALESCE(NEW.license_number, 'Pending'),
          ' has been issued and is now active.'
        );
      
      ELSE
        notification_title := 'Status Update';
        notification_message := CONCAT(
          'Your business license application #',
          COALESCE(NEW.license_number, 'Pending'),
          ' status has been updated.'
        );
    END CASE;
    
    -- Final safety check
    IF notification_message IS NULL OR TRIM(notification_message) = '' THEN
      notification_message := 'Your business license status has been updated.';
    END IF;
    
    action_url := '/business-licenses/' || NEW.id;
    
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
      'business_license',
      COALESCE(NEW.license_number, 'Pending'),
      'status_change',
      OLD.application_status::text,
      NEW.application_status::text,
      'business_license',
      NEW.id,
      action_url,
      jsonb_build_object(
        'license_number', COALESCE(NEW.license_number, 'Pending'),
        'license_type', COALESCE(license_type_name, 'Business License'),
        'status', NEW.application_status::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ========================================
-- Part 2: Harden Permit Status Notification & Remove Duplicates
-- ========================================

-- Drop old trigger if it exists (from deprecated permit_notifications table)
DROP TRIGGER IF EXISTS create_permit_status_notification_trigger ON public.permit_applications;

-- Create or replace the permit status notification function with NULL-safe logic
CREATE OR REPLACE FUNCTION public.create_permit_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  action_url TEXT;
  permit_type_name TEXT;
BEGIN
  -- Only create notifications for status changes
  IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
    
    -- Get permit type name
    SELECT pt.name INTO permit_type_name
    FROM public.permit_types pt
    WHERE pt.id = NEW.permit_type_id;
    
    -- Build notification content based on status
    CASE NEW.application_status
      WHEN 'submitted' THEN
        notification_title := 'Permit Application Submitted';
        notification_message := CONCAT(
          'Your permit application #',
          COALESCE(NEW.permit_number, 'Pending'),
          ' has been submitted successfully.'
        );
      
      WHEN 'under_review' THEN
        notification_title := 'Application Under Review';
        notification_message := CONCAT(
          'Your permit application #',
          COALESCE(NEW.permit_number, 'Pending'),
          ' is now under review.'
        );
      
      WHEN 'information_requested' THEN
        notification_title := 'Information Requested';
        notification_message := CONCAT(
          'Additional information is needed for your permit application #',
          COALESCE(NEW.permit_number, 'Pending'),
          '. Please check your application for details.'
        );
      
      WHEN 'approved' THEN
        notification_title := 'Permit Approved';
        notification_message := CONCAT(
          'Congratulations! Your permit application #',
          COALESCE(NEW.permit_number, 'Pending'),
          ' has been approved.'
        );
      
      WHEN 'denied' THEN
        notification_title := 'Permit Denied';
        notification_message := CONCAT(
          'Your permit application #',
          COALESCE(NEW.permit_number, 'Pending'),
          ' has been denied. Please review the details for more information.'
        );
      
      WHEN 'issued' THEN
        notification_title := 'Permit Issued';
        notification_message := CONCAT(
          'Your permit #',
          COALESCE(NEW.permit_number, 'Pending'),
          ' has been issued and is now active.'
        );
      
      ELSE
        notification_title := 'Status Update';
        notification_message := CONCAT(
          'Your permit application #',
          COALESCE(NEW.permit_number, 'Pending'),
          ' status has been updated.'
        );
    END CASE;
    
    -- Final safety check
    IF notification_message IS NULL OR TRIM(notification_message) = '' THEN
      notification_message := 'Your permit application status has been updated.';
    END IF;
    
    action_url := '/permits/' || NEW.id;
    
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
      'permit',
      COALESCE(NEW.permit_number, 'Pending'),
      'status_change',
      OLD.application_status::text,
      NEW.application_status::text,
      'permit',
      NEW.id,
      action_url,
      jsonb_build_object(
        'permit_number', COALESCE(NEW.permit_number, 'Pending'),
        'permit_type', COALESCE(permit_type_name, 'Building Permit'),
        'status', NEW.application_status::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger to ensure it points to the correct function
DROP TRIGGER IF EXISTS create_permit_status_notification_trigger ON public.permit_applications;
CREATE TRIGGER create_permit_status_notification_trigger
  AFTER UPDATE ON public.permit_applications
  FOR EACH ROW
  WHEN (OLD.application_status IS DISTINCT FROM NEW.application_status)
  EXECUTE FUNCTION public.create_permit_status_notification();

-- ========================================
-- Part 3: Add Defense-in-Depth Database Default
-- ========================================

-- Set default empty string for message column as a safety net
ALTER TABLE public.user_notifications 
ALTER COLUMN message SET DEFAULT '';

-- Add explanatory comment
COMMENT ON COLUMN public.user_notifications.message IS 
  'Notification message content. Default empty string prevents NULL errors, but application code should always provide meaningful content.';