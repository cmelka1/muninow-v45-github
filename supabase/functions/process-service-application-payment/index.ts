import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Data Structures
interface ProcessServiceApplicationPaymentRequest {
  tile_id: string;
  amount_cents: number;
  payment_instrument_id: string;
  total_amount_cents: number;
  idempotency_id: string;
  fraud_session_id?: string;
  // Application data
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
  business_legal_name?: string;
  street_address?: string;
  apt_number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  additional_information?: string;
  service_specific_data?: any;
  documents?: any[];
}

interface FinixTransferRequest {
  amount: number;
  currency: string;
  merchant: string;
  source: string;
  idempotency_id: string;
  tags?: {
    fraud_session_id?: string;
  };
}

interface FinixTransferResponse {
  id: string;
  state: string;
  failure_code?: string;
  failure_message?: string;
  [key: string]: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Processing service application payment request: ${req.method}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Parse request body
    const requestBody: ProcessServiceApplicationPaymentRequest = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Check for duplicate idempotency ID
    const { data: existingPayment } = await supabase
      .from('payment_history')
      .select('id')
      .eq('idempotency_id', requestBody.idempotency_id)
      .single();

    if (existingPayment) {
      return new Response(
        JSON.stringify({ error: 'Payment already processed with this idempotency ID' }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Get service tile data
    const { data: serviceTile, error: tileError } = await supabase
      .from('municipal_service_tiles')
      .select('*')
      .eq('id', requestBody.tile_id)
      .single();

    if (tileError || !serviceTile) {
      console.error('Service tile not found:', tileError);
      return new Response(
        JSON.stringify({ error: 'Service tile not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get payment instrument details
    const { data: paymentInstrument, error: instrumentError } = await supabase
      .from('user_payment_instruments')
      .select('*')
      .eq('id', requestBody.payment_instrument_id)
      .eq('user_id', user.id)
      .single();

    if (instrumentError || !paymentInstrument) {
      console.error('Payment instrument not found:', instrumentError);
      return new Response(
        JSON.stringify({ error: 'Payment instrument not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get merchant fee profile
    const { data: feeProfile, error: feeError } = await supabase
      .from('merchant_fee_profiles')
      .select('*')
      .eq('merchant_id', serviceTile.merchant_id)
      .single();

    if (feeError || !feeProfile) {
      console.error('Fee profile not found:', feeError);
      return new Response(
        JSON.stringify({ error: 'Fee profile not found for merchant' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Calculate service fee based on payment type
    const isACH = paymentInstrument.instrument_type === 'BANK_ACCOUNT';
    const calculatedServiceFee = isACH 
      ? (feeProfile.ach_fixed_fee || 0) + Math.round((requestBody.amount_cents * (feeProfile.ach_basis_points || 0)) / 10000)
      : (feeProfile.fixed_fee || 0) + Math.round((requestBody.amount_cents * (feeProfile.basis_points || 0)) / 10000);

    // Validate total amount
    const expectedTotal = requestBody.amount_cents + calculatedServiceFee;
    if (Math.abs(requestBody.total_amount_cents - expectedTotal) > 1) {
      console.error('Amount mismatch:', {
        provided: requestBody.total_amount_cents,
        expected: expectedTotal,
        baseAmount: requestBody.amount_cents,
        serviceFee: calculatedServiceFee
      });
      return new Response(
        JSON.stringify({ 
          error: 'Amount validation failed',
          expected: expectedTotal,
          provided: requestBody.total_amount_cents
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get Finix credentials
    const finixUsername = Deno.env.get('FINIX_USERNAME');
    const finixPassword = Deno.env.get('FINIX_PASSWORD');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';

    if (!finixUsername || !finixPassword) {
      return new Response(
        JSON.stringify({ error: 'Finix API credentials not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const FINIX_API_URL = finixEnvironment === 'live' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    // First, create application atomically with database function
    const documentsJsonb = (requestBody.documents || []).map(doc => ({
      file_name: doc.name,
      file_size: doc.size,
      content_type: doc.type,
      storage_path: doc.storage_path,
      document_type: doc.document_type || 'general'
    }));

    const { data: atomicResult, error: atomicError } = await supabase
      .rpc('create_service_application_with_payment', {
        p_tile_id: requestBody.tile_id,
        p_user_id: user.id,
        p_customer_id: serviceTile.customer_id,
        p_amount_cents: requestBody.amount_cents,
        p_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        p_total_amount_cents: requestBody.total_amount_cents,
        p_service_fee_cents: calculatedServiceFee,
        p_payment_type: isACH ? 'ACH' : 'CARD',
        p_idempotency_id: requestBody.idempotency_id,
        p_merchant_id: serviceTile.merchant_id,
        p_finix_merchant_id: serviceTile.finix_merchant_id,
        p_merchant_name: serviceTile.title,
        p_statement_descriptor: serviceTile.title,
        p_applicant_name: requestBody.applicant_name,
        p_applicant_email: requestBody.applicant_email,
        p_applicant_phone: requestBody.applicant_phone,
        p_business_legal_name: requestBody.business_legal_name,
        p_street_address: requestBody.street_address,
        p_apt_number: requestBody.apt_number,
        p_city: requestBody.city,
        p_state: requestBody.state,
        p_zip_code: requestBody.zip_code,
        p_additional_information: requestBody.additional_information,
        p_service_specific_data: requestBody.service_specific_data || {},
        p_documents: documentsJsonb,
        p_fraud_session_id: requestBody.fraud_session_id,
        p_card_brand: paymentInstrument.card_brand,
        p_card_last_four: paymentInstrument.card_last_four,
        p_bank_last_four: paymentInstrument.bank_last_four
      });

    if (atomicError || !atomicResult?.success) {
      console.error('Atomic application creation failed:', atomicError || atomicResult?.error);
      return new Response(
        JSON.stringify({ 
          error: 'Application creation failed',
          details: atomicError?.message || atomicResult?.error
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const applicationId = atomicResult.application_id;
    const paymentHistoryId = atomicResult.payment_history_id;

    // Now process payment with Finix
    const finixTransferPayload: FinixTransferRequest = {
      amount: requestBody.total_amount_cents,
      currency: 'USD',
      merchant: serviceTile.finix_merchant_id!,
      source: paymentInstrument.finix_payment_instrument_id,
      idempotency_id: requestBody.idempotency_id,
      tags: requestBody.fraud_session_id ? {
        fraud_session_id: requestBody.fraud_session_id
      } : undefined,
    };

    console.log('Creating Finix transfer with payload:', JSON.stringify(finixTransferPayload, null, 2));

    const finixResponse = await fetch(`${FINIX_API_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${finixUsername}:${finixPassword}`)}`,
        'Finix-Version': '2022-02-01',
      },
      body: JSON.stringify(finixTransferPayload),
    });

    if (!finixResponse.ok) {
      const errorText = await finixResponse.text();
      console.error('Finix transfer failed:', {
        status: finixResponse.status,
        statusText: finixResponse.statusText,
        body: errorText,
      });

      // Update application and payment status to failed
      await supabase
        .from('municipal_service_applications')
        .update({ status: 'payment_failed' })
        .eq('id', applicationId);

      await supabase
        .from('payment_history')
        .update({ 
          payment_status: 'failed',
          transfer_state: 'FAILED',
          failure_message: errorText
        })
        .eq('id', paymentHistoryId);

      return new Response(
        JSON.stringify({ 
          error: 'Payment processing failed',
          details: errorText 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const finixData: FinixTransferResponse = await finixResponse.json();
    console.log('Finix response:', JSON.stringify(finixData, null, 2));

    // Handle different transfer states
    let applicationStatus = 'submitted';
    let paymentStatus = 'pending';
    
    if (finixData.state === 'SUCCEEDED') {
      applicationStatus = serviceTile.requires_review ? 'submitted' : 'approved';
      paymentStatus = 'completed';
    } else if (finixData.state === 'FAILED') {
      applicationStatus = 'payment_failed';
      paymentStatus = 'failed';
    }

    // Update application and payment status
    await supabase
      .from('municipal_service_applications')
      .update({ 
        status: applicationStatus,
        payment_processed_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    await supabase
      .from('payment_history')
      .update({ 
        payment_status: paymentStatus,
        transfer_state: finixData.state,
        finix_transfer_id: finixData.id,
        failure_message: finixData.failure_message || null
      })
      .eq('id', paymentHistoryId);

    console.log('Service application payment processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        application_id: applicationId,
        transfer_id: finixData.id,
        status: applicationStatus,
        amount: requestBody.total_amount_cents,
        payment_status: paymentStatus
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unexpected error in service application payment:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});