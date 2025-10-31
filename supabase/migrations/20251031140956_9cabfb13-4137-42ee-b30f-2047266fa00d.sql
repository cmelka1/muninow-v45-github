-- Delete Mary Keller's withdrawn business license application and related records

-- Step 1: Delete the renewal history record first (foreign key dependency)
DELETE FROM business_license_renewal_history
WHERE id = '28e301c3-6901-4e2b-9b18-270b83aa82c7';

-- Step 2: Delete the withdrawn business license application
DELETE FROM business_license_applications
WHERE id = '0f310390-2777-4b40-9932-6cfd258a730d';