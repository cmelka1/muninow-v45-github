-- Update permit_status_enum to include all workflow statuses
ALTER TYPE permit_status_enum ADD VALUE IF NOT EXISTS 'information_requested';
ALTER TYPE permit_status_enum ADD VALUE IF NOT EXISTS 'resubmitted';
ALTER TYPE permit_status_enum ADD VALUE IF NOT EXISTS 'denied';
ALTER TYPE permit_status_enum ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE permit_status_enum ADD VALUE IF NOT EXISTS 'expired';

-- Add additional timestamp fields for tracking status transitions
ALTER TABLE public.permit_applications 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS under_review_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS information_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS denied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_reviewer_id UUID,
ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS denial_reason TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- Add foreign key for assigned reviewer
ALTER TABLE public.permit_applications 
ADD CONSTRAINT fk_assigned_reviewer 
FOREIGN KEY (assigned_reviewer_id) REFERENCES public.profiles(id);

-- Create function to automatically set timestamp when status changes
CREATE OR REPLACE FUNCTION public.update_permit_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set submitted_at when status changes to submitted
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.submitted_at = NOW();
  END IF;
  
  -- Set under_review_at when status changes to under_review
  IF NEW.status = 'under_review' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.under_review_at = NOW();
  END IF;
  
  -- Set information_requested_at when status changes to information_requested
  IF NEW.status = 'information_requested' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.information_requested_at = NOW();
  END IF;
  
  -- Set resubmitted_at when status changes to resubmitted
  IF NEW.status = 'resubmitted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.resubmitted_at = NOW();
  END IF;
  
  -- Set approved_at when status changes to approved
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.approved_at = NOW();
  END IF;
  
  -- Set denied_at when status changes to denied
  IF NEW.status = 'denied' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.denied_at = NOW();
  END IF;
  
  -- Set withdrawn_at when status changes to withdrawn
  IF NEW.status = 'withdrawn' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.withdrawn_at = NOW();
  END IF;
  
  -- Set expired_at when status changes to expired
  IF NEW.status = 'expired' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.expired_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_permit_status_timestamps_trigger
  BEFORE UPDATE ON public.permit_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_permit_status_timestamps();

-- Create function to auto-assign permits to municipal reviewers
CREATE OR REPLACE FUNCTION public.auto_assign_permit_reviewer()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_id UUID;
BEGIN
  -- Only auto-assign when status changes to 'submitted' or 'under_review'
  IF NEW.status IN ('submitted', 'under_review') AND NEW.assigned_reviewer_id IS NULL THEN
    -- Find a municipal user for this customer who can review permits
    SELECT p.id INTO reviewer_id
    FROM public.profiles p
    WHERE p.customer_id = NEW.customer_id 
      AND p.account_type = 'municipal'
    ORDER BY RANDOM() -- Simple round-robin could be improved
    LIMIT 1;
    
    IF reviewer_id IS NOT NULL THEN
      NEW.assigned_reviewer_id = reviewer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment
CREATE TRIGGER auto_assign_permit_reviewer_trigger
  BEFORE INSERT OR UPDATE ON public.permit_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_permit_reviewer();

-- Create table for permit status change notifications
CREATE TABLE IF NOT EXISTS public.permit_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_permit_notifications_permit 
    FOREIGN KEY (permit_id) REFERENCES public.permit_applications(id),
  CONSTRAINT fk_permit_notifications_user 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Enable RLS on permit_notifications
ALTER TABLE public.permit_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for permit_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.permit_notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" 
ON public.permit_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.permit_notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to send notifications on status changes
CREATE OR REPLACE FUNCTION public.create_permit_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
BEGIN
  -- Only create notifications on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Set notification content based on new status
    CASE NEW.status
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
      NEW.id,
      recipient_id,
      'status_change',
      notification_title,
      notification_message
    );
    
    -- Also notify assigned reviewer if status is submitted
    IF NEW.status = 'submitted' AND NEW.assigned_reviewer_id IS NOT NULL THEN
      INSERT INTO public.permit_notifications (
        permit_id,
        user_id,
        notification_type,
        title,
        message
      ) VALUES (
        NEW.id,
        NEW.assigned_reviewer_id,
        'assignment',
        'New Permit Assignment',
        'You have been assigned to review permit application #' || NEW.permit_number || '.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change notifications
CREATE TRIGGER create_permit_status_notification_trigger
  AFTER UPDATE ON public.permit_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_permit_status_notification();