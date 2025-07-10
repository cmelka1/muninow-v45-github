-- Phase 1: Create Required Enums
CREATE TYPE bill_status_enum AS ENUM ('paid', 'unpaid', 'overdue', 'delinquent', 'cancelled', 'disputed', 'refunded');

CREATE TYPE payment_status_enum AS ENUM ('paid', 'unpaid', 'partially_paid');

CREATE TYPE data_quality_status_enum AS ENUM ('validated', 'pending_validation', 'failed_validation', 'manual_review_required', 'corrected');

CREATE TYPE assignment_status_enum AS ENUM ('assigned', 'unassigned', 'pending_review');

-- Phase 2: Create Master Bills Table
CREATE TABLE master_bills (
  -- Identity & Tracking
  bill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_bill_number TEXT NOT NULL,
  external_account_number TEXT,
  merchant_id UUID REFERENCES merchants(id),
  data_source_system TEXT NOT NULL,
  original_bill_snapshot JSONB,

  -- Core Bill Data  
  amount_due_cents BIGINT NOT NULL,
  original_amount_cents BIGINT NOT NULL,
  remaining_balance_cents BIGINT NOT NULL,
  total_paid_cents BIGINT DEFAULT 0,
  calculated_fee_cents BIGINT,
  total_amount_cents BIGINT NOT NULL,

  -- Late Fees (up to 3 separate fees)
  late_fee_1_cents BIGINT DEFAULT 0,
  late_fee_1_applied_date TIMESTAMP WITH TIME ZONE,
  late_fee_2_cents BIGINT DEFAULT 0,
  late_fee_2_applied_date TIMESTAMP WITH TIME ZONE,
  late_fee_3_cents BIGINT DEFAULT 0,
  late_fee_3_applied_date TIMESTAMP WITH TIME ZONE,
  total_late_fees_cents BIGINT GENERATED ALWAYS AS 
    (COALESCE(late_fee_1_cents, 0) + COALESCE(late_fee_2_cents, 0) + COALESCE(late_fee_3_cents, 0)) STORED,

  -- Dates & Timestamps
  issue_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  past_due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ingestion_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_reconciled_at TIMESTAMP WITH TIME ZONE,

  -- Status & Categories (aligned with merchants table)
  bill_status bill_status_enum DEFAULT 'unpaid',
  payment_status payment_status_enum DEFAULT 'unpaid',
  category TEXT, -- Same as merchants.category
  subcategory TEXT, -- Same as merchants.subcategory
  type TEXT,

  -- Customer Information (Municipality from merchants table)
  customer_id UUID NOT NULL,
  legal_entity_name TEXT,
  doing_business_as TEXT,
  entity_type TEXT,
  business_address_line1 TEXT,
  business_address_line2 TEXT,
  business_city TEXT,
  business_state TEXT,
  business_zip_code TEXT,
  municipality_timezone TEXT,

  -- User Profile Information (Bill Payer) - DENORMALIZED for performance
  profile_id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  street_address TEXT,
  apt_number TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  account_type TEXT,
  business_legal_name TEXT,
  business_legal_name_normalized TEXT,
  finix_identity_id TEXT,

  -- Merchant Information (from merchants table)
  merchant_name TEXT,
  statement_descriptor TEXT,
  bank_masked_account_number TEXT,

  -- Finix Integration (denormalized)
  finix_merchant_id TEXT,
  finix_merchant_profile_id TEXT,
  merchant_payout_id TEXT,
  finix_payout_profile_id TEXT,
  merchant_fee_profile_id TEXT,
  finix_fee_profile_id TEXT,
  ach_basis_points INTEGER,
  ach_fixed_fee INTEGER,
  basis_points INTEGER,
  fixed_fee INTEGER,
  idempotency_id TEXT,
  fraud_session_id TEXT,

  -- Payment Processing Tracking
  payment_method_external TEXT,
  external_payment_reference TEXT,
  payment_processed_by TEXT,

  -- Smart Matching System
  match_score DECIMAL(3,2),
  match_criteria_details JSONB,
  assignment_status assignment_status_enum DEFAULT 'unassigned',
  requires_review BOOLEAN DEFAULT FALSE,

  -- Data Quality & Validation
  data_quality_status data_quality_status_enum DEFAULT 'pending_validation',
  data_quality_score DECIMAL(3,2),
  validation_errors JSONB,
  validation_status TEXT DEFAULT 'pending',
  manual_review_required BOOLEAN DEFAULT FALSE,

  -- Processing & Audit Trail
  processing_status TEXT DEFAULT 'raw',
  error_log JSONB,
  retry_count INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  modification_count INTEGER DEFAULT 0,
  change_history JSONB[],
  transformation_applied TEXT[],
  raw_source_data JSONB,

  -- System-Specific Data (flexible storage)
  bill_specific_data JSONB,
  usage_details JSONB,

  -- Audit Trail
  created_by_system TEXT,
  last_modified_by TEXT,
  modification_reason TEXT,
  duplicate_check_hash TEXT,
  matching_confidence DECIMAL(3,2),
  manual_match_override BOOLEAN DEFAULT FALSE,

  -- Constraints
  CONSTRAINT unique_external_bill UNIQUE (external_bill_number, data_source_system),
  CONSTRAINT positive_amounts CHECK (amount_due_cents >= 0 AND total_amount_cents >= 0)
);

-- Phase 3: Performance Indexes
CREATE INDEX CONCURRENTLY idx_bills_user_payment_status 
  ON master_bills (profile_id, payment_status, due_date) 
  WHERE payment_status IN ('unpaid', 'partially_paid');

CREATE INDEX CONCURRENTLY idx_bills_user_payment_category 
  ON master_bills (profile_id, payment_status, category);

CREATE INDEX CONCURRENTLY idx_bills_external_lookup 
  ON master_bills (data_source_system, external_bill_number);

CREATE INDEX CONCURRENTLY idx_bills_merchant_payment 
  ON master_bills (merchant_id, payment_status);

CREATE INDEX CONCURRENTLY idx_bills_matching 
  ON master_bills (match_score, assignment_status);

CREATE INDEX CONCURRENTLY idx_bills_unassigned 
  ON master_bills (assignment_status, match_score) 
  WHERE assignment_status = 'unassigned';

CREATE INDEX CONCURRENTLY idx_bills_due_date_payment 
  ON master_bills (due_date, payment_status);

CREATE INDEX CONCURRENTLY idx_bills_amount_payment 
  ON master_bills (total_amount_cents, payment_status);

CREATE INDEX CONCURRENTLY idx_bills_specific_data_gin 
  ON master_bills USING GIN (bill_specific_data);

CREATE INDEX CONCURRENTLY idx_bills_requires_review 
  ON master_bills (requires_review) 
  WHERE requires_review = true;

-- Phase 4: Business Name Normalization Function
CREATE OR REPLACE FUNCTION normalize_business_name(business_name TEXT) 
RETURNS TEXT AS $$
BEGIN
  IF business_name IS NULL OR trim(business_name) = '' THEN
    RETURN '';
  END IF;
  
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(business_name, '\s+(LLC|Inc|Corp|Co|Company|Corporation|Limited|Ltd)\.?\s*$', '', 'i'),
      '[[:punct:]]', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Phase 5: Smart Matching Algorithm
CREATE OR REPLACE FUNCTION smart_bill_matching(input_bill_id UUID)
RETURNS VOID AS $$
DECLARE
  bill_record master_bills%ROWTYPE;
  final_user_id UUID;
  match_score DECIMAL(3,2) := 0;
  match_details JSONB := '{}';
  address_score DECIMAL(3,2);
  name_score DECIMAL(3,2);
BEGIN
  -- Get bill details
  SELECT * INTO bill_record FROM master_bills WHERE bill_id = input_bill_id;
  
  -- PRIORITY 1: Business Bill Routing
  IF bill_record.business_legal_name IS NOT NULL AND trim(bill_record.business_legal_name) != '' THEN
    SELECT 
      id, 
      SIMILARITY(normalize_business_name(business_legal_name), normalize_business_name(bill_record.business_legal_name)) * 0.6 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.4
    INTO final_user_id, match_score
    FROM profiles 
    WHERE account_type = 'business'
      AND business_legal_name IS NOT NULL
    ORDER BY (
      SIMILARITY(normalize_business_name(business_legal_name), normalize_business_name(bill_record.business_legal_name)) * 0.6 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.4
    ) DESC
    LIMIT 1;
    
    match_details := jsonb_build_object('type', 'business', 'business_name_match', true);
  
  -- PRIORITY 2: Personal Bill Routing  
  ELSE
    SELECT 
      id,
      SIMILARITY(COALESCE(last_name, ''), COALESCE(bill_record.last_name, '')) * 0.4 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.6
    INTO final_user_id, match_score
    FROM profiles 
    WHERE account_type = 'resident'
    ORDER BY (
      SIMILARITY(COALESCE(last_name, ''), COALESCE(bill_record.last_name, '')) * 0.4 +
      SIMILARITY(COALESCE(street_address || ' ' || city || ' ' || state, ''), 
                 COALESCE(bill_record.street_address || ' ' || bill_record.city || ' ' || bill_record.state, '')) * 0.6
    ) DESC
    LIMIT 1;
    
    match_details := jsonb_build_object('type', 'personal', 'name_match', true);
  END IF;

  -- Update bill based on match score
  IF final_user_id IS NOT NULL AND match_score >= 0.70 THEN
    -- High confidence match - auto assign
    UPDATE master_bills 
    SET 
      profile_id = final_user_id,
      user_id = final_user_id,
      assignment_status = 'assigned',
      match_score = match_score,
      match_criteria_details = match_details,
      requires_review = false,
      updated_at = now()
    WHERE bill_id = input_bill_id;
  
  ELSIF final_user_id IS NOT NULL AND match_score BETWEEN 0.30 AND 0.69 THEN
    -- Medium confidence - requires manual review
    UPDATE master_bills 
    SET 
      profile_id = final_user_id,
      user_id = final_user_id,
      assignment_status = 'pending_review',
      match_score = match_score,
      requires_review = true,
      match_criteria_details = match_details,
      updated_at = now()
    WHERE bill_id = input_bill_id;
  
  ELSE
    -- Low confidence or no match
    UPDATE master_bills 
    SET 
      assignment_status = 'unassigned',
      match_score = COALESCE(match_score, 0),
      match_criteria_details = match_details,
      updated_at = now()
    WHERE bill_id = input_bill_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 6: Change Tracking System
CREATE OR REPLACE FUNCTION track_bill_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB := '{}';
BEGIN
  -- Track important field changes
  IF OLD.amount_due_cents IS DISTINCT FROM NEW.amount_due_cents THEN
    changes := changes || jsonb_build_object('amount_due_cents', 
      jsonb_build_object('from', OLD.amount_due_cents, 'to', NEW.amount_due_cents));
  END IF;
  
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    changes := changes || jsonb_build_object('payment_status', 
      jsonb_build_object('from', OLD.payment_status, 'to', NEW.payment_status));
  END IF;
  
  IF OLD.bill_status IS DISTINCT FROM NEW.bill_status THEN
    changes := changes || jsonb_build_object('bill_status', 
      jsonb_build_object('from', OLD.bill_status, 'to', NEW.bill_status));
  END IF;

  IF OLD.profile_id IS DISTINCT FROM NEW.profile_id THEN
    changes := changes || jsonb_build_object('profile_id', 
      jsonb_build_object('from', OLD.profile_id, 'to', NEW.profile_id));
  END IF;

  -- Add to change history if changes detected
  IF changes != '{}' THEN
    NEW.change_history := COALESCE(OLD.change_history, '[]'::JSONB[]) || 
      ARRAY[jsonb_build_object(
        'timestamp', NOW(),
        'changes', changes,
        'version', NEW.version,
        'trigger', 'system_update'
      )];
    NEW.modification_count := COALESCE(OLD.modification_count, 0) + 1;
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bill_change_tracking
  BEFORE UPDATE ON master_bills
  FOR EACH ROW
  EXECUTE FUNCTION track_bill_changes();

-- Phase 7: Supporting Tables
CREATE TABLE bill_matching_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  bill_id UUID,
  trigger_type TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE bill_processing_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID,
  raw_bill_data JSONB,
  failure_reason TEXT,
  failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  manual_review_required BOOLEAN DEFAULT FALSE
);

-- Phase 8: Row Level Security
ALTER TABLE master_bills ENABLE ROW LEVEL SECURITY;

-- Users can only see their assigned bills
CREATE POLICY "Users can view their own bills" ON master_bills 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

-- Super admins can see all bills
CREATE POLICY "Super admins can view all bills" ON master_bills 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'superAdmin'
    )
  );

-- System can insert bills (for external integrations)
CREATE POLICY "System can insert bills" ON master_bills 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Users can update their own bills (payment status, etc.)
CREATE POLICY "Users can update their own bills" ON master_bills 
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

-- Phase 9: Trigger for new user bill matching
CREATE OR REPLACE FUNCTION trigger_bill_matching_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue background job to re-run matching for unassigned bills
  INSERT INTO bill_matching_queue (user_id, trigger_type, created_at)
  VALUES (NEW.id, 'new_user_signup', NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_user_bill_matching
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_bill_matching_for_new_user();

-- Phase 10: Monitoring Views
CREATE VIEW bill_quality_metrics AS
SELECT 
  data_source_system,
  COUNT(*) as total_bills,
  COUNT(*) FILTER (WHERE requires_review = true) as bills_requiring_review,
  ROUND(AVG(match_score), 2) as avg_match_score,
  COUNT(*) FILTER (WHERE assignment_status = 'unassigned') as unassigned_bills,
  COUNT(*) FILTER (WHERE data_quality_status = 'failed_validation') as validation_failures
FROM master_bills 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY data_source_system;

CREATE VIEW user_bill_summary AS
SELECT 
  profile_id,
  user_id,
  COUNT(*) as total_bills,
  COUNT(*) FILTER (WHERE payment_status = 'unpaid') as unpaid_bills,
  SUM(total_amount_cents) FILTER (WHERE payment_status = 'unpaid') as total_due_cents,
  MIN(due_date) FILTER (WHERE payment_status = 'unpaid') as next_due_date,
  MAX(updated_at) as last_bill_update
FROM master_bills 
WHERE assignment_status = 'assigned'
GROUP BY profile_id, user_id;