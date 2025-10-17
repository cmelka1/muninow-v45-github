-- Delete orphaned service applications that reference non-existent tiles
DELETE FROM public.municipal_service_applications
WHERE tile_id = 'b3301019-21e3-4e76-b35c-bc57e863cdf5';

-- Restore the foreign key constraint for tile_id that was incorrectly dropped
ALTER TABLE public.municipal_service_applications 
ADD CONSTRAINT fk_municipal_service_applications_tile_id 
FOREIGN KEY (tile_id) REFERENCES public.municipal_service_tiles(id);