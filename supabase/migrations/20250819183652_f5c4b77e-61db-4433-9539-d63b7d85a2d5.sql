-- Create storage bucket for municipal service forms
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'municipal-service-forms',
  'municipal-service-forms',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);

-- Create RLS policies for the bucket
CREATE POLICY "Public can view municipal service forms"
ON storage.objects
FOR SELECT
USING (bucket_id = 'municipal-service-forms');

CREATE POLICY "Municipal users can upload forms for their customer"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'municipal-service-forms' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal'
    AND customer_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Municipal users can update their forms"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'municipal-service-forms'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal'
    AND customer_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Municipal users can delete their forms"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'municipal-service-forms'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND account_type = 'municipal'
    AND customer_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Super admins can manage all forms"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'municipal-service-forms'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'superAdmin'
  )
);