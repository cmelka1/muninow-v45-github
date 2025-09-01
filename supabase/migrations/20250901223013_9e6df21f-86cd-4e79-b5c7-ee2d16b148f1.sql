-- Add missing foreign key constraints for municipal_service_applications table

-- Add foreign key constraint from municipal_service_applications.customer_id to customers.customer_id
ALTER TABLE public.municipal_service_applications 
ADD CONSTRAINT fk_municipal_service_applications_customer_id 
FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);

-- Add foreign key constraint from municipal_service_applications.tile_id to municipal_service_tiles.id
ALTER TABLE public.municipal_service_applications 
ADD CONSTRAINT fk_municipal_service_applications_tile_id 
FOREIGN KEY (tile_id) REFERENCES public.municipal_service_tiles(id);

-- Add foreign key constraint from municipal_service_applications.user_id to auth.users.id
-- Note: This creates a reference to the auth schema which is managed by Supabase
ALTER TABLE public.municipal_service_applications 
ADD CONSTRAINT fk_municipal_service_applications_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id);