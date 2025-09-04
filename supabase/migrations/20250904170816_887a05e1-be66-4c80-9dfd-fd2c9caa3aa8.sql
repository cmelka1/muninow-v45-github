-- Update the foreign key constraint for business_license_applications.license_type_id
-- to reference municipal_business_license_types instead of business_license_types

-- First, drop the existing foreign key constraint
ALTER TABLE public.business_license_applications 
DROP CONSTRAINT IF EXISTS business_license_applications_license_type_id_fkey;

-- Add the new foreign key constraint to reference municipal_business_license_types
ALTER TABLE public.business_license_applications 
ADD CONSTRAINT business_license_applications_license_type_id_fkey 
FOREIGN KEY (license_type_id) 
REFERENCES public.municipal_business_license_types(id) 
ON DELETE SET NULL;