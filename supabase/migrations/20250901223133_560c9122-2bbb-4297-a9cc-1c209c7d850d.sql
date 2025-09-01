-- Simple migration to just enable RLS on municipal_service_applications
-- The foreign keys were already added successfully, so the relationship should work now

ALTER TABLE public.municipal_service_applications ENABLE ROW LEVEL SECURITY;