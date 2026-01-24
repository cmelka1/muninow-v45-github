-- DIAGNOSTIC: Disable the Smart Trigger temporarily
-- If SMS Send works after running this, we KNOW the crash is inside the 'handle_new_user' function logic.

DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
