-- Create permit inspections table
CREATE TABLE public.permit_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL,
  inspection_type TEXT NOT NULL,
  inspector_id UUID,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  result TEXT, -- passed, failed, needs_correction
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit review requests table (for requesting additional information)
CREATE TABLE public.permit_review_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'information_request',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit review comments table (for communication)
CREATE TABLE public.permit_review_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  attachment_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.permit_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_review_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for permit_inspections
CREATE POLICY "Municipal users can manage inspections for their customer permits"
ON public.permit_inspections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.permit_applications pa
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE pa.permit_id = permit_inspections.permit_id
    AND p.account_type = 'municipal'
    AND p.customer_id = pa.customer_id
  )
);

CREATE POLICY "Users can view inspections for their permits"
ON public.permit_inspections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.permit_applications pa
    WHERE pa.permit_id = permit_inspections.permit_id
    AND pa.user_id = auth.uid()
  )
);

-- Create RLS policies for permit_review_requests
CREATE POLICY "Municipal users can manage review requests for their customer permits"
ON public.permit_review_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.permit_applications pa
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE pa.permit_id = permit_review_requests.permit_id
    AND p.account_type = 'municipal'
    AND p.customer_id = pa.customer_id
  )
);

CREATE POLICY "Users can view and respond to review requests for their permits"
ON public.permit_review_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.permit_applications pa
    WHERE pa.permit_id = permit_review_requests.permit_id
    AND pa.user_id = auth.uid()
  )
);

-- Create RLS policies for permit_review_comments
CREATE POLICY "Municipal users can manage comments for their customer permits"
ON public.permit_review_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.permit_applications pa
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE pa.permit_id = permit_review_comments.permit_id
    AND p.account_type = 'municipal'
    AND p.customer_id = pa.customer_id
  )
);

CREATE POLICY "Users can view non-internal comments and add comments to their permits"
ON public.permit_review_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.permit_applications pa
    WHERE pa.permit_id = permit_review_comments.permit_id
    AND pa.user_id = auth.uid()
    AND (permit_review_comments.is_internal = false OR permit_review_comments.user_id = auth.uid())
  )
);

CREATE POLICY "Users can add comments to their permits"
ON public.permit_review_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.permit_applications pa
    WHERE pa.permit_id = permit_review_comments.permit_id
    AND pa.user_id = auth.uid()
  )
  AND permit_review_comments.user_id = auth.uid()
  AND permit_review_comments.is_internal = false
);

-- Create triggers for updated_at
CREATE TRIGGER update_permit_inspections_updated_at
BEFORE UPDATE ON public.permit_inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permit_review_requests_updated_at
BEFORE UPDATE ON public.permit_review_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permit_review_comments_updated_at
BEFORE UPDATE ON public.permit_review_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();