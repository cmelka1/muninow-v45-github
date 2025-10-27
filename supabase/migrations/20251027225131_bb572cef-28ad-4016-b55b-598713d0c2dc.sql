-- Remove duplicate business license types created in the latest migration
-- Keep the original entries that were created earlier

DELETE FROM municipal_business_license_types 
WHERE id IN (
  '67aec8d2-270a-417d-ba5b-1ca6fe746dec',  -- Animal Hospital (duplicate from latest migration)
  'ee9a0b2f-b6eb-41a7-b03d-673fd521c527',  -- Audio-Visual Production (duplicate from latest migration)
  '9b13de31-243b-49a8-92fa-1aebfe7798c6'   -- Pet Grooming (duplicate from latest migration)
);