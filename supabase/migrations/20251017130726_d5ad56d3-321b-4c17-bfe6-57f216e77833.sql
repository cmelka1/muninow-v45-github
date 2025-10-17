-- Migration: Remove all Dog Permit applications
-- Keep the Dog Permit service tile for potential future use
-- Created: 2025-10-17

-- Log what we're about to delete (for audit trail)
DO $$
DECLARE
  app_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO app_count
  FROM public.municipal_service_applications msa
  JOIN public.municipal_service_tiles mst ON mst.id = msa.tile_id
  WHERE mst.title ILIKE '%dog%';
  
  RAISE NOTICE 'About to delete % Dog Permit application(s)', app_count;
END $$;

-- Delete all Dog Permit applications
-- This will remove the 5 issued applications while keeping the service tile
DELETE FROM public.municipal_service_applications
WHERE tile_id IN (
  SELECT id 
  FROM public.municipal_service_tiles 
  WHERE title ILIKE '%dog%'
);

-- Verify deletion
DO $$
DECLARE
  remaining_count INTEGER;
  tile_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM public.municipal_service_applications msa
  JOIN public.municipal_service_tiles mst ON mst.id = msa.tile_id
  WHERE mst.title ILIKE '%dog%';
  
  SELECT EXISTS(SELECT 1 FROM public.municipal_service_tiles WHERE title ILIKE '%dog%') INTO tile_exists;
  
  RAISE NOTICE 'Remaining Dog Permit applications after deletion: %', remaining_count;
  RAISE NOTICE 'Dog Permit service tile still available: %', tile_exists;
END $$;