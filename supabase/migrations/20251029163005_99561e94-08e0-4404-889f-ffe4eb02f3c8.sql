-- Phase 1: Fix empty municipal_label values and add validation

-- First, backfill empty labels from linked standard permit_types
UPDATE municipal_permit_types mpt
SET municipal_label = pt.name,
    updated_at = now()
FROM permit_types pt
WHERE mpt.permit_type_id = pt.id
  AND (mpt.municipal_label = '' OR mpt.municipal_label IS NULL)
  AND mpt.permit_type_id IS NOT NULL;

-- For custom types with empty labels, set a placeholder requiring admin review
UPDATE municipal_permit_types
SET municipal_label = 'CUSTOM TYPE - REQUIRES LABEL',
    updated_at = now()
WHERE (municipal_label = '' OR municipal_label IS NULL)
  AND is_custom = true;

-- Add CHECK constraint to prevent future empty labels
ALTER TABLE municipal_permit_types
ADD CONSTRAINT municipal_label_not_empty 
CHECK (municipal_label <> '' AND municipal_label IS NOT NULL);