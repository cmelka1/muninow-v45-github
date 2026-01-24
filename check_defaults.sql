SELECT column_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles';
