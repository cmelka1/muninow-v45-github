-- FIX: Ensure timestamps have defaults
-- The "Unexpected failure" is often caused by the Trigger trying to insert a row
-- without providing 'created_at' or 'updated_at', and the table missing a DEFAULT value.

ALTER TABLE public.profiles 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

-- Also ensure email is nullable (re-applying to be safe)
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
