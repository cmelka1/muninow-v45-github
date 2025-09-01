-- Enable RLS on municipal_service_applications table (if not already enabled)
ALTER TABLE public.municipal_service_applications ENABLE ROW LEVEL SECURITY;

-- Create policies that don't already exist
-- Check if policies exist before creating them

-- Policy: Users can view their own service applications (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'municipal_service_applications' 
        AND policyname = 'Users can view their own service applications'
    ) THEN
        CREATE POLICY "Users can view their own service applications" 
        ON public.municipal_service_applications 
        FOR SELECT 
        USING (user_id = auth.uid());
    END IF;
END $$;

-- Policy: Users can insert their own service applications (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'municipal_service_applications' 
        AND policyname = 'Users can insert their own service applications'
    ) THEN
        CREATE POLICY "Users can insert their own service applications" 
        ON public.municipal_service_applications 
        FOR INSERT 
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Policy: Users can update their own service applications (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'municipal_service_applications' 
        AND policyname = 'Users can update their own service applications'
    ) THEN
        CREATE POLICY "Users can update their own service applications" 
        ON public.municipal_service_applications 
        FOR UPDATE 
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Policy: Super admins can manage all applications (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'municipal_service_applications' 
        AND policyname = 'Super admins can manage all service applications'
    ) THEN
        CREATE POLICY "Super admins can manage all service applications" 
        ON public.municipal_service_applications 
        FOR ALL 
        USING (EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid() 
          AND r.name = 'superAdmin'
        ));
    END IF;
END $$;