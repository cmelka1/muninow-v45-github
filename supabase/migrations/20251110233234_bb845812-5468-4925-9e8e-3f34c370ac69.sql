-- Add guidance_text and requires_document_upload columns to municipal_service_tiles
ALTER TABLE public.municipal_service_tiles
ADD COLUMN guidance_text text,
ADD COLUMN requires_document_upload boolean NOT NULL DEFAULT false;

-- Add helpful comments for documentation
COMMENT ON COLUMN public.municipal_service_tiles.guidance_text IS 'Optional guidance text displayed at the top of the application form to help guide applicants';
COMMENT ON COLUMN public.municipal_service_tiles.requires_document_upload IS 'Indicates whether applicants must upload supporting documents to submit the application';