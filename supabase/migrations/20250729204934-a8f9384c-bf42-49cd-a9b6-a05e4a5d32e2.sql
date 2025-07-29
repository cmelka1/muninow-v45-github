-- Add contractor_name field to permit_contractors table
ALTER TABLE permit_contractors 
ADD COLUMN IF NOT EXISTS contractor_name TEXT;