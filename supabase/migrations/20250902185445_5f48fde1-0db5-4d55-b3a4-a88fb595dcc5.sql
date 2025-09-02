-- Create atomic service application processing function (fixed parameter defaults)
CREATE OR REPLACE FUNCTION public.create_service_application_with_payment(
  p_tile_id uuid,
  p_user_id uuid,
  p_customer_id uuid,
  p_amount_cents bigint,
  p_payment_instrument_id text,
  p_total_amount_cents bigint,
  p_service_fee_cents bigint,
  p_payment_type text,
  p_idempotency_id text,
  p_merchant_id uuid,
  p_finix_merchant_id text,
  p_merchant_name text,
  p_statement_descriptor text,
  p_applicant_name text DEFAULT NULL,
  p_applicant_email text DEFAULT NULL,
  p_applicant_phone text DEFAULT NULL,
  p_business_legal_name text DEFAULT NULL,
  p_street_address text DEFAULT NULL,
  p_apt_number text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_zip_code text DEFAULT NULL,
  p_additional_information text DEFAULT NULL,
  p_service_specific_data jsonb DEFAULT '{}',
  p_documents jsonb DEFAULT '[]',
  p_fraud_session_id text DEFAULT NULL,
  p_card_brand text DEFAULT NULL,
  p_card_last_four text DEFAULT NULL,
  p_bank_last_four text DEFAULT NULL
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application_id uuid;
  v_payment_history_id uuid;
  v_document jsonb;
  result jsonb;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Create service application with submitted status (skip draft)
  INSERT INTO public.municipal_service_applications (
    tile_id,
    user_id,
    customer_id,
    status,
    amount_cents,
    applicant_name,
    applicant_email,
    applicant_phone,
    business_legal_name,
    street_address,
    apt_number,
    city,
    state,
    zip_code,
    additional_information,
    service_specific_data,
    submitted_at
  ) VALUES (
    p_tile_id,
    p_user_id,
    p_customer_id,
    'submitted',
    p_amount_cents,
    p_applicant_name,
    p_applicant_email,
    p_applicant_phone,
    p_business_legal_name,
    p_street_address,
    p_apt_number,
    p_city,
    p_state,
    p_zip_code,
    p_additional_information,
    p_service_specific_data,
    now()
  ) RETURNING id INTO v_application_id;

  -- Link documents to the application
  FOR v_document IN SELECT * FROM jsonb_array_elements(p_documents)
  LOOP
    INSERT INTO public.service_application_documents (
      application_id,
      user_id,
      customer_id,
      file_name,
      file_size,
      content_type,
      storage_path,
      document_type
    ) VALUES (
      v_application_id,
      p_user_id,
      p_customer_id,
      v_document->>'file_name',
      (v_document->>'file_size')::bigint,
      v_document->>'content_type',
      v_document->>'storage_path',
      v_document->>'document_type'
    );
  END LOOP;

  -- Create payment history record with pending status
  INSERT INTO public.payment_history (
    user_id,
    customer_id,
    service_application_id,
    amount_cents,
    service_fee_cents,
    total_amount_cents,
    payment_type,
    payment_status,
    currency,
    finix_payment_instrument_id,
    idempotency_id,
    fraud_session_id,
    card_brand,
    card_last_four,
    bank_last_four,
    merchant_id,
    finix_merchant_id,
    merchant_name,
    category,
    subcategory,
    statement_descriptor,
    transfer_state
  ) VALUES (
    p_user_id,
    p_customer_id,
    v_application_id,
    p_amount_cents,
    p_service_fee_cents,
    p_total_amount_cents,
    p_payment_type,
    'pending',
    'USD',
    p_payment_instrument_id,
    p_idempotency_id,
    p_fraud_session_id,
    p_card_brand,
    p_card_last_four,
    p_bank_last_four,
    p_merchant_id,
    p_finix_merchant_id,
    p_merchant_name,
    'Municipal Services',
    'Other Services',
    p_statement_descriptor,
    'PENDING'
  ) RETURNING id INTO v_payment_history_id;

  -- Return success with IDs
  result := jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'payment_history_id', v_payment_history_id
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details, transaction will be rolled back automatically
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$;