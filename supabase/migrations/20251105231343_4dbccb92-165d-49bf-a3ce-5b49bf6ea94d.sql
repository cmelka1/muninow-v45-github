-- Add is_guest column to profiles table for guest checkout tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Create index for efficient guest user queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest_created_at 
ON public.profiles(is_guest, created_at) 
WHERE is_guest = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_guest IS 
'Tracks whether this profile was created for guest checkout (Apple Pay, Google Pay, etc.). Guest users can later upgrade to full accounts.';