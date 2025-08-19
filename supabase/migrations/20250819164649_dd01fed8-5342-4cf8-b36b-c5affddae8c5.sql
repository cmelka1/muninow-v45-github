-- Create municipal service tiles table
CREATE TABLE public.municipal_service_tiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  pdf_form_url text,
  amount_cents bigint NOT NULL DEFAULT 0,
  requires_review boolean NOT NULL DEFAULT false,
  merchant_id uuid,
  finix_merchant_id text,
  merchant_fee_profile_id text,
  form_fields jsonb DEFAULT '[]'::jsonb,
  auto_populate_user_info boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create municipal service applications table
CREATE TABLE public.municipal_service_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tile_id uuid NOT NULL REFERENCES public.municipal_service_tiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  form_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'denied', 'paid')),
  payment_id uuid,
  fraud_session_id text,
  idempotency_id text,
  reviewed_by uuid,
  review_notes text,
  review_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.municipal_service_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_service_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for municipal_service_tiles
CREATE POLICY "Municipal users can manage tiles for their customer" 
ON public.municipal_service_tiles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.account_type = 'municipal' 
  AND profiles.customer_id = municipal_service_tiles.customer_id
));

CREATE POLICY "Public can read active tiles for municipality search" 
ON public.municipal_service_tiles 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage all tiles" 
ON public.municipal_service_tiles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

-- RLS policies for municipal_service_applications
CREATE POLICY "Users can view their own applications" 
ON public.municipal_service_applications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own applications" 
ON public.municipal_service_applications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft applications" 
ON public.municipal_service_applications 
FOR UPDATE 
USING (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "Municipal users can view applications for their customer" 
ON public.municipal_service_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.account_type = 'municipal' 
  AND profiles.customer_id = municipal_service_applications.customer_id
));

CREATE POLICY "Municipal users can update applications for their customer" 
ON public.municipal_service_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.account_type = 'municipal' 
  AND profiles.customer_id = municipal_service_applications.customer_id
));

CREATE POLICY "Super admins can manage all applications" 
ON public.municipal_service_applications 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid() 
  AND r.name = 'superAdmin'
));

-- Create indexes for performance
CREATE INDEX idx_municipal_service_tiles_customer_id ON public.municipal_service_tiles(customer_id);
CREATE INDEX idx_municipal_service_tiles_active ON public.municipal_service_tiles(is_active) WHERE is_active = true;
CREATE INDEX idx_municipal_service_applications_tile_id ON public.municipal_service_applications(tile_id);
CREATE INDEX idx_municipal_service_applications_user_id ON public.municipal_service_applications(user_id);
CREATE INDEX idx_municipal_service_applications_status ON public.municipal_service_applications(status);

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_municipal_service_tiles_updated_at
  BEFORE UPDATE ON public.municipal_service_tiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_municipal_service_applications_updated_at
  BEFORE UPDATE ON public.municipal_service_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger for application status changes
CREATE OR REPLACE FUNCTION public.create_service_application_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  tile_title TEXT;
  action_url TEXT;
BEGIN
  -- Only create notifications on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get tile title for notification
    SELECT title INTO tile_title
    FROM public.municipal_service_tiles
    WHERE id = NEW.tile_id;
    
    -- Set notification content based on new status
    CASE NEW.status
      WHEN 'submitted' THEN
        notification_title := 'Service Application Submitted';
        notification_message := 'Your application for "' || tile_title || '" has been submitted successfully.';
      WHEN 'under_review' THEN
        notification_title := 'Application Under Review';
        notification_message := 'Your application for "' || tile_title || '" is now under review.';
      WHEN 'approved' THEN
        notification_title := 'Application Approved';
        notification_message := 'Your application for "' || tile_title || '" has been approved and is ready for payment.';
      WHEN 'denied' THEN
        notification_title := 'Application Denied';
        notification_message := 'Your application for "' || tile_title || '" has been denied. Please check the review notes for details.';
      WHEN 'paid' THEN
        notification_title := 'Payment Complete';
        notification_message := 'Payment for "' || tile_title || '" has been processed successfully.';
      ELSE
        RETURN NEW; -- No notification for other statuses
    END CASE;
    
    -- Set action URL
    action_url := '/other-services';
    
    -- Insert notification
    INSERT INTO public.user_notifications (
      user_id,
      notification_type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url
    ) VALUES (
      NEW.user_id,
      'service_application_status',
      notification_title,
      notification_message,
      'service_application',
      NEW.id,
      action_url
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER service_application_status_notification
  AFTER UPDATE ON public.municipal_service_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_service_application_notification();