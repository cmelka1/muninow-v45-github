-- FIX SMS SIGNUP CRASH
-- When a user signs up via Phone, they initially have NO Email.
-- The current 'NOT NULL' constraint on profiles.email causes the database to reject the new user.

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Optional: If you want to force email later, we can add a check constraint, 
-- but for the initial creation step, it MUST be nullable.
