-- Enable functionality for Building Permit Renewals

-- Update permit_types_v2 to support renewal configuration
ALTER TABLE permit_types_v2
ADD COLUMN IF NOT EXISTS is_renewable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS renewal_reminder_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS renewal_fee_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validity_duration_days INTEGER DEFAULT 365;

-- Update permit_applications to track renewal state
ALTER TABLE permit_applications
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS renewal_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS renewal_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS renewal_reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_permit_id UUID REFERENCES permit_applications(permit_id),
ADD COLUMN IF NOT EXISTS renewal_generation INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT false;

-- Create renewal history table
CREATE TABLE IF NOT EXISTS permit_renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_permit_id UUID REFERENCES permit_applications(permit_id) ON DELETE CASCADE,
  renewed_permit_id UUID REFERENCES permit_applications(permit_id) ON DELETE CASCADE,
  renewal_generation INTEGER NOT NULL,
  renewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_permit_applications_expires_at ON permit_applications(expires_at);
CREATE INDEX IF NOT EXISTS idx_permit_applications_renewal_status ON permit_applications(renewal_status);
CREATE INDEX IF NOT EXISTS idx_permit_applications_original_permit_id ON permit_applications(original_permit_id);
CREATE INDEX IF NOT EXISTS idx_permit_renewal_history_original ON permit_renewal_history(original_permit_id);
