import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ProcessServiceApplicationPaymentRequest {
  applicationId: string;
  paymentInstrumentId: string;
  totalAmount: number;
  serviceFee: number;
  fraudSessionId?: string;
  idempotencyId: string;
  cardBrand?: string;
  cardLastFour?: string;
  bankLastFour?: string;
}

interface FinixTransferRequest {
  amount: number;
  currency: string;
  destination: string;
  source: string;
  fee?: number;
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
      .eq('idempotency_id', requestBody.idempotencyId)
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

    // Get service application details (first query)
    const { data: application, error: applicationError } = await supabase
      .from('municipal_service_applications')
      .select('*')
      .eq('id', requestBody.applicationId)
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

    // Get service tile details using tile_id (second query)
    const { data: serviceTile, error: tileError } = await supabase
      .from('municipal_service_tiles')
      .select('title, amount_cents, requires_review, customer_id')
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

    // Get merchant details from the tile's customer_id
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('customer_id', serviceTile.customer_id)
      .single();

    if (merchantError || !merchant) {
      console.error('Error fetching merchant:', merchantError);
      return new Response(
        JSON.stringify({ error: 'Merchant not found for this municipality' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get merchant fee profile
    const { data: feeProfile, error: feeError } = await supabase
      .from('merchant_fee_profiles')
      .select('*')
      .eq('merchant_id', merchant.id)
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

    // Calculate service fee
    let calculatedServiceFee = 0;
    
    // Determine if this is an ACH payment based on payment instrument type
    const isACH = !requestBody.cardBrand && requestBody.bankLastFour;
    
    if (isACH) {
      calculatedServiceFee = (serviceTile.amount_cents * (feeProfile.ach_basis_points || 0)) / 10000 + (feeProfile.ach_fixed_fee || 0);
    } else {
      calculatedServiceFee = (serviceTile.amount_cents * (feeProfile.basis_points || 0)) / 10000 + (feeProfile.fixed_fee || 0);
    }

    const totalCalculated = serviceTile.amount_cents + calculatedServiceFee;

    // Validate amount
    if (Math.abs(requestBody.totalAmount - totalCalculated) > 1) {
      return new Response(
        JSON.stringify({ 
          error: 'Amount mismatch',
          expected: totalCalculated,
          received: requestBody.totalAmount 
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

    // Prepare Finix transfer request
    const finixApiKey = Deno.env.get('FINIX_API_KEY');
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');

    if (!finixApiKey || !finixApplicationId) {
      return new Response(
        JSON.stringify({ error: 'Finix credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const transferPayload: FinixTransferRequest = {
      amount: requestBody.totalAmount,
      currency: 'USD',
      destination: merchant.finix_merchant_id,
      source: requestBody.paymentInstrumentId,
      fee: calculatedServiceFee,
      merchant_identity: finixIdentity.finix_identity_id,
      tags: {
        application_id: requestBody.applicationId,
        service_type: 'municipal_service',
        user_id: user.id,
        idempotency_id: requestBody.idempotencyId,
      },
    };

    console.log('Creating Finix transfer with payload:', JSON.stringify(transferPayload, null, 2));

    // Create Finix transfer
    const finixResponse = await fetch('https://finix.sandbox-payments-api.com/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(finixApiKey + ':')}`,
        'Finix-Version': '2018-01-01',
      },
      body: JSON.stringify(transferPayload),
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
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        customer_id: serviceTile.customer_id,
        amount_cents: serviceTile.amount_cents,
        service_fee_cents: calculatedServiceFee,
        total_amount_cents: requestBody.totalAmount,
        payment_type: isACH ? 'ACH' : 'CARD',
        payment_status: 'pending',
        payment_method_type: isACH ? 'ACH' : 'CARD',
        payment_instrument_id: requestBody.paymentInstrumentId,
        idempotency_id: requestBody.idempotencyId,
        fraud_session_id: requestBody.fraudSessionId,
        card_brand: requestBody.cardBrand,
        card_last_four: requestBody.cardLastFour,
        bank_last_four: requestBody.bankLastFour,
        merchant_id: merchant.id,
        finix_merchant_id: merchant.finix_merchant_id,
        merchant_name: merchant.merchant_name,
        category: merchant.category,
        subcategory: merchant.subcategory,
        statement_descriptor: merchant.statement_descriptor,
        transfer_state: finixData.state,
        finix_transfer_id: finixData.id,
      })
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
        payment_instrument_id: requestBody.paymentInstrumentId,
        finix_transfer_id: finixData.id,
        fraud_session_id: requestBody.fraudSessionId,
        idempotency_id: requestBody.idempotencyId,
        transfer_state: finixData.state,
        amount_cents: serviceTile.amount_cents,
        service_fee_cents: calculatedServiceFee,
        total_amount_cents: requestBody.totalAmount,
        merchant_id: merchant.id,
        merchant_name: merchant.merchant_name,
        finix_merchant_id: merchant.finix_merchant_id,
        merchant_finix_identity_id: merchant.finix_identity_id,
        finix_identity_id: finixIdentity.finix_identity_id,
        merchant_fee_profile_id: feeProfile.id,
        basis_points: feeProfile.basis_points,
        fixed_fee: feeProfile.fixed_fee,
        ach_basis_points: feeProfile.ach_basis_points,
        ach_fixed_fee: feeProfile.ach_fixed_fee,
        status: finixData.state === 'SUCCEEDED' ? 'paid' : 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestBody.applicationId);

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