-- Rename "Demolition Only" to "Demolition" across all tables

-- 1. Update standard permit type (foundation)
UPDATE permit_types
SET 
  name = 'Demolition',
  updated_at = NOW()
WHERE id = 'e514cad5-4e0c-4d37-8da1-c1a9203f1786';

-- 2. Update municipal permit types (municipality configurations)
UPDATE municipal_permit_types
SET 
  municipal_label = 'Demolition',
  updated_at = NOW()
WHERE municipal_label = 'Demolition Only';

-- 3. Update existing permit applications (historical data)
UPDATE permit_applications
SET 
  permit_type = 'Demolition',
  updated_at = NOW()
WHERE permit_type = 'Demolition Only';

-- 4. Fix the unmatched application (backfill foreign key)
UPDATE permit_applications
SET municipal_permit_type_id = '44da673e-2395-4e21-9e6f-46c7d75cd6ff'
WHERE permit_id = '648f60b7-1b0b-4496-8c6f-cb5800b7529c';