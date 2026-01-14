-- Create inspection_form_templates table
CREATE TABLE IF NOT EXISTS inspection_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add column to permit_inspections if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'permit_inspections' AND column_name = 'inspection_form_template_id'
  ) THEN
    ALTER TABLE permit_inspections ADD COLUMN inspection_form_template_id UUID REFERENCES inspection_form_templates(id);
  END IF;
END $$;

-- Policies (RLS)
ALTER TABLE inspection_form_templates ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid error on replay
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inspection_form_templates;

CREATE POLICY "Enable read access for authenticated users" ON inspection_form_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert seed data
INSERT INTO inspection_form_templates (name, description, structure) VALUES
('Standard Residential', 'Standard residential building inspection form', '{"sections": []}'),
('Plumbing Check', 'Detailed plumbing inspection', '{"sections": []}'),
('Electrical Safety', 'Electrical safety compliance check', '{"sections": []}')
ON CONFLICT DO NOTHING;
