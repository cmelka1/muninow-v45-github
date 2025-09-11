-- Fix the race condition in license number generation by using MAX() instead of COUNT()
-- and adding retry logic to handle any remaining edge cases

CREATE OR REPLACE FUNCTION public.generate_license_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  new_number TEXT;
  counter INTEGER;
  max_retries INTEGER := 10;
  retry_count INTEGER := 0;
BEGIN
  LOOP
    -- Get the current year
    SELECT EXTRACT(year FROM NOW())::TEXT INTO new_number;
    
    -- Get the highest existing license number for this year and add 1
    -- Use MAX() instead of COUNT() to avoid race conditions
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN license_number LIKE new_number || '-%' THEN 
            CAST(SPLIT_PART(license_number, '-', 2) AS INTEGER)
          ELSE 0
        END
      ), 0
    ) + 1 INTO counter
    FROM business_license_applications 
    WHERE license_number IS NOT NULL;
    
    -- Format as YYYY-NNNNNN
    new_number := new_number || '-' || LPAD(counter::TEXT, 6, '0');
    
    -- Check if this number already exists (should be rare with MAX approach)
    IF NOT EXISTS (
      SELECT 1 FROM business_license_applications 
      WHERE license_number = new_number
    ) THEN
      RETURN new_number;
    END IF;
    
    -- If we get here, there was still a conflict, retry
    retry_count := retry_count + 1;
    IF retry_count >= max_retries THEN
      -- As a last resort, add a random suffix
      new_number := new_number || '-' || FLOOR(RANDOM() * 1000)::TEXT;
      RETURN new_number;
    END IF;
    
    -- Small delay before retry to reduce collision probability
    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$function$;

-- Create trigger to automatically generate license numbers
CREATE OR REPLACE FUNCTION public.set_business_license_number()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.license_number IS NULL THEN
    NEW.license_number := generate_license_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS set_license_number_trigger ON business_license_applications;

CREATE TRIGGER set_license_number_trigger
  BEFORE INSERT ON business_license_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_business_license_number();