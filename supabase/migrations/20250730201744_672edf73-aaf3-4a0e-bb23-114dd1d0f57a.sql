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

-- Enable RLS
ALTER TABLE public.permit_inspections ENABLE ROW LEVEL SECURITY;

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

-- Create trigger for updated_at
CREATE TRIGGER update_permit_inspections_updated_at
BEFORE UPDATE ON public.permit_inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();