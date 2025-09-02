import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ProcessServiceApplicationPaymentRequest {
  application_id: string;
  payment_instrument_id: string;
  total_amount_cents: number;
  fraud_session_id?: string;
  idempotency_id: string;
}

interface FinixTransferRequest {
  amount: number;
  currency: string;
  destination: string;
  source: string;
  merchant_identity: string;
  tags?: Record<string, string>;
}

interface FinixTransferResponse {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  source: string;
  fee?: number;
  state: string;
  created_at: string;
  updated_at: string;
  application: string;
  merchant_identity: string;
  tags?: Record<string, string>;
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get payment instrument details to determine type
    const { data: paymentInstrument, error: instrumentError } = await supabase
      .from('user_payment_instruments')
      .select('*')
      .eq('id', requestBody.payment_instrument_id)
      .eq('user_id', user.id)
      .single();

    if (instrumentError || !paymentInstrument) {
      console.error('Error fetching payment instrument:', instrumentError);
      return new Response(
        JSON.stringify({ error: 'Payment instrument not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get service application details (first query)
    const { data: application, error: applicationError } = await supabase
      .from('municipal_service_applications')
      .select('*')
      .eq('id', requestBody.application_id)
      .eq('user_id', user.id)
      .single();

    if (applicationError || !application) {
      console.error('Error fetching application:', applicationError);
      return new Response(
        JSON.stringify({ error: 'Service application not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get service tile details with merchant information (second query)
    const { data: serviceTile, error: tileError } = await supabase
      .from('municipal_service_tiles')
      .select('title, amount_cents, requires_review, customer_id, finix_merchant_id, merchant_id, merchant_fee_profile_id')
      .eq('id', application.tile_id)
      .single();

    if (tileError || !serviceTile) {
      console.error('Error fetching service tile:', tileError);
      return new Response(
        JSON.stringify({ error: 'Service tile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate that required merchant data exists in the tile
    if (!serviceTile.finix_merchant_id || !serviceTile.merchant_id || !serviceTile.merchant_fee_profile_id) {
      console.error('Missing merchant data in service tile:', serviceTile);
      return new Response(
        JSON.stringify({ error: 'Merchant configuration incomplete for this service' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get merchant fee profile directly using tile data
    const { data: feeProfile, error: feeError } = await supabase
      .from('merchant_fee_profiles')
      .select('*')
      .eq('id', serviceTile.merchant_fee_profile_id)
      .single();

    if (feeError || !feeProfile) {
      console.error('Error fetching fee profile:', feeError);
      return new Response(
        JSON.stringify({ error: 'Fee profile not found for merchant' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine if this is an ACH payment based on payment instrument type
    const isACH = paymentInstrument.instrument_type === 'BANK_ACCOUNT';
    
    // Calculate service fee
    let calculatedServiceFee = 0;
    
    if (isACH) {
      calculatedServiceFee = (serviceTile.amount_cents * (feeProfile.ach_basis_points || 0)) / 10000 + (feeProfile.ach_fixed_fee || 0);
    } else {
      calculatedServiceFee = (serviceTile.amount_cents * (feeProfile.basis_points || 0)) / 10000 + (feeProfile.fixed_fee || 0);
    }

    const totalCalculated = serviceTile.amount_cents + calculatedServiceFee;

    // Validate amount
    if (Math.abs(requestBody.total_amount_cents - totalCalculated) > 1) {
      return new Response(
        JSON.stringify({ 
          error: 'Amount mismatch',
          expected: totalCalculated,
          received: requestBody.total_amount_cents 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's Finix identity
    const { data: finixIdentity, error: identityError } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', user.id)
      .single();

    if (identityError || !finixIdentity) {
      console.error('Error fetching Finix identity:', identityError);
      return new Response(
        JSON.stringify({ error: 'User payment identity not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Finix credentials
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';

    if (!finixApplicationId || !finixApiSecret) {
      return new Response(
        JSON.stringify({ error: 'Finix API credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine Finix API URL based on environment
    const finixBaseUrl = finixEnvironment === 'live' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixRequest: FinixTransferRequest = {
      amount: requestBody.total_amount_cents,
      currency: 'USD',
      merchant: serviceTile.finix_merchant_id,
      source: paymentInstrument.finix_payment_instrument_id,
      idempotency_id: requestBody.idempotency_id
    };

    if (requestBody.fraud_session_id) {
      finixRequest.tags = { fraud_session_id: requestBody.fraud_session_id };
    }

    console.log('Creating Finix transfer with payload:', JSON.stringify(finixRequest, null, 2));

    // Create Finix transfer
    const finixResponse = await fetch(`${finixBaseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(finixApplicationId + ':' + finixApiSecret)}`,
        'Finix-Version': '2022-02-01',
      },
      body: JSON.stringify(finixRequest),
    });

    const finixData: FinixTransferResponse = await finixResponse.json();
    console.log('Finix response:', JSON.stringify(finixData, null, 2));

    if (!finixResponse.ok) {
      console.error('Finix transfer failed:', finixData);
      return new Response(
        JSON.stringify({ error: 'Payment processing failed', details: finixData }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Record payment in payment_history
    const paymentHistoryData = {
      user_id: user.id,
      customer_id: serviceTile.customer_id,
      service_application_id: requestBody.application_id,
      amount_cents: serviceTile.amount_cents,
      service_fee_cents: calculatedServiceFee,
      total_amount_cents: requestBody.total_amount_cents,
      payment_type: isACH ? 'ACH' : 'CARD',
      payment_status: 'pending',
      currency: 'USD',
      finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
      idempotency_id: requestBody.idempotency_id,
      fraud_session_id: requestBody.fraud_session_id,
      card_brand: paymentInstrument.card_brand,
      card_last_four: paymentInstrument.card_last_four,
      bank_last_four: paymentInstrument.bank_last_four,
      merchant_id: serviceTile.merchant_id,
      finix_merchant_id: serviceTile.finix_merchant_id,
      merchant_name: serviceTile.title,
      category: 'Municipal Services',
      subcategory: 'Other Services',
      statement_descriptor: serviceTile.title,
      transfer_state: finixData.state,
      finix_transfer_id: finixData.id,
    };

    console.log('Payment history insert data:', JSON.stringify(paymentHistoryData, null, 2));
    console.log('Service application ID value:', requestBody.application_id);
    console.log('Service application ID type:', typeof requestBody.application_id);

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payment_history')
      .insert(paymentHistoryData)
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to record payment' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update service application with payment details
    const { error: updateError } = await supabase
      .from('municipal_service_applications')
      .update({
        payment_id: paymentRecord.id,
        payment_status: 'pending',
        payment_method_type: isACH ? 'ACH' : 'CARD',
        payment_instrument_id: requestBody.payment_instrument_id,
        finix_transfer_id: finixData.id,
        fraud_session_id: requestBody.fraud_session_id,
        idempotency_id: requestBody.idempotency_id,
        transfer_state: finixData.state,
        amount_cents: serviceTile.amount_cents,
        service_fee_cents: calculatedServiceFee,
        total_amount_cents: requestBody.total_amount_cents,
        merchant_id: serviceTile.merchant_id,
        merchant_name: serviceTile.title,
        finix_merchant_id: serviceTile.finix_merchant_id,
        finix_identity_id: finixIdentity.finix_identity_id,
        merchant_fee_profile_id: feeProfile.id,
        basis_points: feeProfile.basis_points,
        fixed_fee: feeProfile.fixed_fee,
        ach_basis_points: feeProfile.ach_basis_points,
        ach_fixed_fee: feeProfile.ach_fixed_fee,
        status: finixData.state === 'SUCCEEDED' ? 'paid' : 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestBody.application_id);

    if (updateError) {
      console.error('Error updating application:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update application with payment details' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Service application payment processed successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        transferId: finixData.id,
        paymentId: paymentRecord.id,
        state: finixData.state,
        amount: finixData.amount,
        serviceFee: calculatedServiceFee,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error in service application payment:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});