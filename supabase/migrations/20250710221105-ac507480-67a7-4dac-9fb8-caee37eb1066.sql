-- Clear legacy business_legal_name from Charles Melka's personal bills
UPDATE master_bills 
SET 
  business_legal_name = NULL,
  business_legal_name_normalized = NULL,
  updated_at = now()
WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44'
  AND external_customer_type = 'resident';

-- Update the smart_bill_matching function to fix branching logic and add debugging
CREATE OR REPLACE FUNCTION smart_bill_matching(input_bill_id UUID)
RETURNS VOID AS $$
DECLARE
  bill_record master_bills%ROWTYPE;
  final_user_id UUID;
  calculated_match_score DECIMAL(3,2) := 0;
  match_details JSONB := '{}';
  address_score DECIMAL(3,2);
  name_score DECIMAL(3,2);
  debug_info TEXT;
BEGIN
  -- Get bill details
  SELECT * INTO bill_record FROM master_bills WHERE bill_id = input_bill_id;
  
  -- Debug: Log which matching path we take
  debug_info := 'Bill ID: ' || input_bill_id || 
                ', external_business_name: ' || COALESCE(bill_record.external_business_name, 'NULL') ||
                ', external_customer_name: ' || COALESCE(bill_record.external_customer_name, 'NULL') ||
                ', business_legal_name: ' || COALESCE(bill_record.business_legal_name, 'NULL');
  
  -- PRIORITY 1: Business Bill Routing (only if external_business_name exists)
  IF bill_record.external_business_name IS NOT NULL AND trim(bill_record.external_business_name) != '' THEN
    SELECT 
      id, 
      SIMILARITY(normalize_business_name(business_legal_name), normalize_business_name(bill_record.external_business_name)) * 0.6 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.external_customer_address_line1 || ' ' || bill_record.external_customer_city || ' ' || bill_record.external_customer_state, '')) * 0.4
    INTO final_user_id, calculated_match_score
    FROM profiles 
    WHERE account_type = 'business'
      AND business_legal_name IS NOT NULL
    ORDER BY (
      SIMILARITY(normalize_business_name(business_legal_name), normalize_business_name(bill_record.external_business_name)) * 0.6 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.external_customer_address_line1 || ' ' || bill_record.external_customer_city || ' ' || bill_record.external_customer_state, '')) * 0.4
    ) DESC
    LIMIT 1;
    
    match_details := jsonb_build_object('type', 'business', 'business_name_match', true, 'debug', debug_info || ' -> EXTERNAL_BUSINESS_PATH');
  
  -- PRIORITY 2: Personal Bill Routing (if external_customer_name exists)
  ELSIF bill_record.external_customer_name IS NOT NULL AND trim(bill_record.external_customer_name) != '' THEN
    SELECT 
      id,
      SIMILARITY(COALESCE(last_name, ''), COALESCE(split_part(bill_record.external_customer_name, ' ', -1), '')) * 0.4 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.external_customer_address_line1 || ' ' || bill_record.external_customer_city || ' ' || bill_record.external_customer_state, '')) * 0.6
    INTO final_user_id, calculated_match_score
    FROM profiles 
    WHERE account_type = 'resident'
    ORDER BY (
      SIMILARITY(COALESCE(last_name, ''), COALESCE(split_part(bill_record.external_customer_name, ' ', -1), '')) * 0.4 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.external_customer_address_line1 || ' ' || bill_record.external_customer_city || ' ' || bill_record.external_customer_state, '')) * 0.6
    ) DESC
    LIMIT 1;
    
    match_details := jsonb_build_object('type', 'personal', 'name_match', true, 'debug', debug_info || ' -> EXTERNAL_CUSTOMER_PATH');
  
  -- FALLBACK 1: Legacy business routing (only if no external fields)
  ELSIF bill_record.business_legal_name IS NOT NULL AND trim(bill_record.business_legal_name) != '' THEN
    SELECT 
      id, 
      SIMILARITY(normalize_business_name(business_legal_name), normalize_business_name(bill_record.business_legal_name)) * 0.6 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.4
    INTO final_user_id, calculated_match_score
    FROM profiles 
    WHERE account_type = 'business'
      AND business_legal_name IS NOT NULL
    ORDER BY (
      SIMILARITY(normalize_business_name(business_legal_name), normalize_business_name(bill_record.business_legal_name)) * 0.6 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.4
    ) DESC
    LIMIT 1;
    
    match_details := jsonb_build_object('type', 'business_legacy', 'business_name_match', true, 'debug', debug_info || ' -> LEGACY_BUSINESS_PATH');
  
  -- FALLBACK 2: Legacy personal routing
  ELSE
    SELECT 
      id,
      SIMILARITY(COALESCE(last_name, ''), COALESCE(bill_record.last_name, '')) * 0.4 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.6
    INTO final_user_id, calculated_match_score
    FROM profiles 
    WHERE account_type = 'resident'
    ORDER BY (
      SIMILARITY(COALESCE(last_name, ''), COALESCE(bill_record.last_name, '')) * 0.4 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.6
    ) DESC
    LIMIT 1;
    
    match_details := jsonb_build_object('type', 'personal_legacy', 'name_match', true, 'debug', debug_info || ' -> LEGACY_PERSONAL_PATH');
  END IF;

  -- Update bill based on match score
  IF final_user_id IS NOT NULL AND calculated_match_score >= 0.70 THEN
    -- High confidence match - auto assign
    UPDATE master_bills 
    SET 
      profile_id = final_user_id,
      user_id = final_user_id,
      assignment_status = 'assigned',
      match_score = calculated_match_score,
      match_criteria_details = match_details,
      requires_review = false,
      updated_at = now()
    WHERE bill_id = input_bill_id;
  
  ELSIF final_user_id IS NOT NULL AND calculated_match_score BETWEEN 0.30 AND 0.69 THEN
    -- Medium confidence - requires manual review
    UPDATE master_bills 
    SET 
      profile_id = final_user_id,
      user_id = final_user_id,
      assignment_status = 'pending_review',
      match_score = calculated_match_score,
      requires_review = true,
      match_criteria_details = match_details,
      updated_at = now()
    WHERE bill_id = input_bill_id;
  
  ELSE
    -- Low confidence or no match
    UPDATE master_bills 
    SET 
      assignment_status = 'unassigned',
      match_score = COALESCE(calculated_match_score, 0),
      match_criteria_details = match_details,
      updated_at = now()
    WHERE bill_id = input_bill_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-run matching for all Charles Melka's bills and test bills
DO $$
DECLARE
  bill_record RECORD;
  bills_processed INTEGER := 0;
BEGIN
  -- Process Charles Melka's bills and test bills
  FOR bill_record IN 
    SELECT bill_id 
    FROM master_bills 
    WHERE user_id = '24ed7570-d3ff-4015-abed-8dec75318b44' 
       OR external_bill_number LIKE 'TEST-MATCH-%'
  LOOP
    -- Run the smart matching function
    PERFORM smart_bill_matching(bill_record.bill_id);
    bills_processed := bills_processed + 1;
  END LOOP;
  
  RAISE NOTICE 'Re-processed % bills with updated matching logic', bills_processed;
END $$;