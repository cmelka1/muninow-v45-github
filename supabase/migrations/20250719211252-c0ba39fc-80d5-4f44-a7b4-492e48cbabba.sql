
-- Fix merchant subcategories to match the merchant categories constants
UPDATE merchants 
SET subcategory = 'Business Licenses' 
WHERE subcategory = 'Business Licensing';

UPDATE merchants 
SET subcategory = 'Parking Tickets' 
WHERE subcategory = 'Parking Ticket';

-- Update master_bills to inherit correct categories from their associated merchants
UPDATE master_bills 
SET 
  category = merchants.category,
  subcategory = merchants.subcategory
FROM merchants 
WHERE master_bills.merchant_id = merchants.id
  AND merchants.category IS NOT NULL 
  AND merchants.subcategory IS NOT NULL;

-- Update bills that don't have merchant associations but have mismatched data
UPDATE master_bills 
SET subcategory = 'Business Licenses' 
WHERE subcategory = 'Business Licensing';

UPDATE master_bills 
SET subcategory = 'Parking Tickets' 
WHERE subcategory = 'Parking Ticket';

-- Ensure all category/subcategory combinations are valid by setting defaults for invalid ones
UPDATE master_bills 
SET 
  category = 'Other',
  subcategory = 'Other'
WHERE NOT validate_merchant_category_subcategory(category, subcategory)
  OR category IS NULL 
  OR subcategory IS NULL;
