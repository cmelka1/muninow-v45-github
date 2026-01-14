-- Offline Inspection System Schema

-- 1. Inspection Form Templates creation handled in 20251219163000_add_inspection_form_templates.sql

-- Policies for Templates
  -- Anyone can read active templates (for inspectors to download)
CREATE POLICY "Enable read access for all users" ON public.inspection_form_templates
  FOR SELECT USING (true);

  -- Only municipal admins can create/update (simplifying to 'municipal' account type for now based on requirements)
CREATE POLICY "Enable write access for municipal users" ON public.inspection_form_templates
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
    )
  );

-- 2. Inspection Checklists
CREATE TABLE public.inspection_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES public.permit_inspections(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.inspection_form_templates(id),
  
  -- The core data
  checklist_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  started_at timestamptz,
  completed_at timestamptz,
  
  -- Signatures
  inspector_signature_url text, -- Legacy/Simple URL
  customer_signature_url text,
  
  -- Enhanced Signature Data (from Architecture)
  inspector_signature_data text, -- Base64/DataURI if needed, or path
  inspector_signature_name text,
  inspector_signed_at timestamptz,
  
  -- Sync Meta
  sync_status text DEFAULT 'draft', -- 'draft', 'synced', 'conflict'
  device_id text,
  device_timestamp timestamptz, -- For conflict resolution
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspection_checklists ENABLE ROW LEVEL SECURITY;

-- Policies for Checklists
CREATE POLICY "Municipal users can view all checklists" ON public.inspection_checklists
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
    )
  );

CREATE POLICY "Municipal users can insert checklists" ON public.inspection_checklists
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
    )
  );

CREATE POLICY "Municipal users can update their own checklists" ON public.inspection_checklists
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
    )
  );

-- 3. Inspection Photos
CREATE TABLE public.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES public.permit_inspections(id) ON DELETE CASCADE,
  checklist_item_id text NOT NULL, -- "foundation_crack_1"
  
  storage_path text NOT NULL,
  public_url text,
  caption text,
  
  taken_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

-- Policies for Photos
CREATE POLICY "Municipal users can view photos" ON public.inspection_photos
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
    )
  );

CREATE POLICY "Municipal users can insert photos" ON public.inspection_photos
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE account_type IN ('municipal', 'municipaladmin', 'municipaluser')
    )
  );

-- Indexes for performance
CREATE INDEX idx_inspection_checklists_inspection_id ON public.inspection_checklists(inspection_id);
CREATE INDEX idx_inspection_photos_inspection_id ON public.inspection_photos(inspection_id);

-- 4. Permit Inspections Update Policy (for Offline Sync)
-- Inspectors need to be able to update the status to 'completed'
CREATE POLICY "Inspectors can update their assigned inspections" ON public.permit_inspections
  FOR UPDATE USING (
    inspector_id = auth.uid()
  ) WITH CHECK (
    inspector_id = auth.uid()
  );
