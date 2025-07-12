-- Create validation function for merchant categories
CREATE OR REPLACE FUNCTION validate_merchant_category_subcategory(p_category text, p_subcategory text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Validate category and subcategory combinations based on merchant form structure
  CASE p_category
    WHEN 'Utilities & Services' THEN
      RETURN p_subcategory IN ('Water', 'Sewer', 'Stormwater', 'Trash / Solid Waste / Recycling', 'Electric', 'Natural Gas');
    WHEN 'Property-Related' THEN
      RETURN p_subcategory IN ('Property Taxes', 'Special Assessments', 'Lien Payments', 'Permit Fees', 'Zoning & Planning Fees', 'Code Violation Fines', 'HOA Dues');
    WHEN 'Vehicle & Transportation' THEN
      RETURN p_subcategory IN ('Parking Tickets', 'Parking Permits', 'Vehicle Stickers', 'Traffic Fines', 'Toll or Bridge Fees');
    WHEN 'Licensing & Registration' THEN
      RETURN p_subcategory IN ('Business Licenses', 'Pet Licenses', 'Rental Property Registration', 'Short-Term Rental Permits', 'Solicitor Permits', 'Liquor Licenses');
    WHEN 'Administrative & Civic Fees' THEN
      RETURN p_subcategory IN ('Public Records Requests (FOIA)', 'Notary Services', 'Document Certification', 'Copy & Printing Fees');
    WHEN 'Court & Legal' THEN
      RETURN p_subcategory IN ('Court Fines', 'Probation Fees', 'Warrants / Bonds', 'Restitution Payments', 'Court Filing Fees');
    WHEN 'Community Programs & Education' THEN
      RETURN p_subcategory IN ('Recreation Program Fees', 'Library Fines or Fees', 'Facility Rentals');
    WHEN 'Police / Fire / Emergency Services' THEN
      RETURN p_subcategory IN ('False Alarm Fines', 'Fire Inspection Fees', 'Police Reports', 'Fingerprinting / Background Checks');
    WHEN 'Health & Sanitation' THEN
      RETURN p_subcategory IN ('Health Permits', 'Septic Tank Inspection Fees', 'Food Safety Licenses');
    WHEN 'Other Specialized Payments' THEN
      RETURN p_subcategory IN ('Impact Fees', 'Development Review Fees', 'Tree Removal / Arborist Permits', 'Cemetery Plot or Burial Fees', 'Inspections', 'Consulting');
    WHEN 'Other' THEN
      RETURN p_subcategory = 'Other';
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Fix specific category/subcategory mismatches
UPDATE master_bills SET category = 'Licensing & Registration', subcategory = 'Business Licenses' WHERE category = 'Business Licenses';
UPDATE master_bills SET category = 'Police / Fire / Emergency Services', subcategory = 'Fire Inspection Fees' WHERE category = 'Fire Inspection Fees';
UPDATE master_bills SET category = 'Health & Sanitation', subcategory = 'Health Permits' WHERE category = 'Health Permits';
UPDATE master_bills SET category = 'Vehicle & Transportation', subcategory = 'Parking Tickets' WHERE category = 'Parking Tickets';
UPDATE master_bills SET category = 'Property-Related', subcategory = 'Permit Fees' WHERE category = 'Permit Fees';
UPDATE master_bills SET category = 'Property-Related', subcategory = 'Property Taxes' WHERE category = 'Property Taxes';
UPDATE master_bills SET category = 'Property-Related', subcategory = 'Special Assessments' WHERE category = 'Special Assessments';
UPDATE master_bills SET category = 'Vehicle & Transportation', subcategory = 'Traffic Fines' WHERE category = 'Traffic Fines';
UPDATE master_bills SET category = 'Property-Related', subcategory = 'Zoning & Planning Fees' WHERE category = 'Zoning & Planning Fees';

-- Set default values for any remaining NULL categories/subcategories
UPDATE master_bills 
SET 
  category = 'Other',
  subcategory = 'Other'
WHERE category IS NULL OR subcategory IS NULL;

-- Add check constraints to ensure valid category/subcategory combinations
ALTER TABLE master_bills 
ADD CONSTRAINT valid_category_subcategory 
CHECK (validate_merchant_category_subcategory(category, subcategory));

-- Add check constraint to ensure category is from valid list
ALTER TABLE master_bills
ADD CONSTRAINT valid_category
CHECK (category IN (
  'Utilities & Services',
  'Property-Related', 
  'Vehicle & Transportation',
  'Licensing & Registration',
  'Administrative & Civic Fees',
  'Court & Legal',
  'Community Programs & Education',
  'Police / Fire / Emergency Services',
  'Health & Sanitation',
  'Other Specialized Payments',
  'Other'
));