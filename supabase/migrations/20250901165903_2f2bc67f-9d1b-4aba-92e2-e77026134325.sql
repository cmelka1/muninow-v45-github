-- Add foreign key constraint between municipal_service_tiles and merchants
ALTER TABLE public.municipal_service_tiles 
ADD CONSTRAINT fk_municipal_service_tiles_merchant_id 
FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);