import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessServiceApplicationApplePayRequest {
  application_id: string;
  apple_pay_token: string;
  billing_contact?: {
    givenName?: string;
    familyName?: string;
    postalCode?: string;
    countryCode?: string;
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
  };
  total_amount_cents: number;
  idempotency_id: string;
  fraud_session_id?: string;
}

interface FinixTransferRequest {
  amount: number;
  currency: string;
  processor: string;
  merchant_identity: string;
  source: {
    id: string;
  };
  fee?: {
    amount: number;
  };
  tags?: {
    idempotency_id: string;
    application_id: string;
    fraud_session_id?: string;
  };
}

interface FinixTransferResponse {
  id: string;
  amount: number;
  currency: string;
  state: string;
  processor_response?: any;
  failure_code?: string;
  failure_message?: string;
}

serve(async (req) => {
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
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ProcessServiceApplicationApplePayRequest = await req.json();
    const { 
      application_id, 
      apple_pay_token, 
      billing_contact, 
      total_amount_cents, 
      idempotency_id,
      fraud_session_id 
    } = body;

    console.log('Processing Apple Pay service application payment:', {
      application_id,
      user_id: user.id,
      total_amount_cents,
      idempotency_id
    });

    // Check for duplicate idempotency ID
    const { data: existingPayment } = await supabase
      .from('payment_history')
      .select('id, payment_status')
      .eq('idempotency_id', idempotency_id)
      .single();

    if (existingPayment) {
      console.log('Duplicate payment attempt detected:', idempotency_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment already processed',
          redirect_url: `/payment-confirmation?payment_id=${existingPayment.id}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service application details
    const { data: application, error: appError } = await supabase
      .from('municipal_service_applications')
      .select(`
        *,
        municipal_service_tiles (
          title,
          amount_cents,
          merchant_id,
          allow_user_defined_amount,
          merchants (
            finix_merchant_id,
            merchant_name,
            finix_identity_id
          )
        )
      `)
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      console.error('Service application not found:', appError);
      return new Response(
        JSON.stringify({ success: false, error: 'Service application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const merchant = application.municipal_service_tiles?.merchants;
    if (!merchant?.finix_merchant_id || !merchant?.finix_identity_id) {
      console.error('Merchant not properly configured for payments');
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not configured for payments' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get merchant fee profile for service fee calculation
    const { data: feeProfile } = await supabase
      .from('merchant_fee_profiles')
      .select('*')
      .eq('merchant_id', application.municipal_service_tiles.merchant_id)
      .single();

    // Calculate service fee
    const baseAmount = application.amount_cents;
    const isCard = true; // Apple Pay is always card-based
    
    let serviceFeeAmount = 0;
    if (feeProfile) {
      const basisPoints = feeProfile.basis_points || 0;
      const fixedFee = feeProfile.fixed_fee || 0;
      serviceFeeAmount = Math.round((baseAmount * basisPoints) / 10000) + fixedFee;
    }

    // Validate the total amount
    const expectedTotal = baseAmount + serviceFeeAmount;
    if (Math.abs(total_amount_cents - expectedTotal) > 1) { // Allow 1 cent variance for rounding
      console.error('Amount mismatch:', { 
        expected: expectedTotal, 
        received: total_amount_cents,
        baseAmount,
        serviceFeeAmount 
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Payment amount validation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Finix identity
    const { data: userIdentity } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', user.id)
      .single();

    if (!userIdentity?.finix_identity_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User payment identity not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Finix API credentials
    const finixApiKey = Deno.env.get('FINIX_API_KEY');
    if (!finixApiKey) {
      console.error('Finix API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment processor not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finixApiUrl = 'https://finix.sandbox-payments-api.com';
    const finixHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(finixApiKey + ':')}`,
    };

    // Create Finix Payment Instrument from Apple Pay token
    const paymentInstrumentPayload = {
      type: "APPLE_PAY",
      token: apple_pay_token,
      identity: userIdentity.finix_identity_id,
      ...(billing_contact && {
        billing_address: {
          name: `${billing_contact.givenName || ''} ${billing_contact.familyName || ''}`.trim(),
          postal_code: billing_contact.postalCode,
          country: billing_contact.countryCode || "USA",
          line1: billing_contact.addressLines?.[0],
          line2: billing_contact.addressLines?.[1],
          city: billing_contact.locality,
          region: billing_contact.administrativeArea,
        }
      })
    };

    console.log('Creating Finix Payment Instrument for Apple Pay');
    const paymentInstrumentResponse = await fetch(`${finixApiUrl}/payment_instruments`, {
      method: 'POST',
      headers: finixHeaders,
      body: JSON.stringify(paymentInstrumentPayload),
    });

    const paymentInstrumentData = await paymentInstrumentResponse.json();
    
    if (!paymentInstrumentResponse.ok) {
      console.error('Failed to create payment instrument:', paymentInstrumentData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process Apple Pay token'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment instrument created:', paymentInstrumentData.id);

    // Record payment in payment_history
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        service_application_id: application_id,
        user_id: user.id,
        customer_id: application.customer_id,
        payment_instrument_id: paymentInstrumentData.id,
        payment_method_type: 'apple_pay',
        base_amount_cents: baseAmount,
        service_fee_cents: serviceFeeAmount,
        total_amount_cents: total_amount_cents,
        payment_status: 'processing',
        idempotency_id: idempotency_id,
        fraud_session_id: fraud_session_id,
        billing_address: billing_contact ? JSON.stringify(billing_contact) : null,
      })
      .select()
      .single();

    if (paymentError || !paymentRecord) {
      console.error('Failed to record payment:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Finix Transfer
    const transferPayload: FinixTransferRequest = {
      amount: total_amount_cents,
      currency: "USD",
      processor: "FINIX",
      merchant_identity: merchant.finix_identity_id,
      source: {
        id: paymentInstrumentData.id
      },
      fee: serviceFeeAmount > 0 ? { amount: serviceFeeAmount } : undefined,
      tags: {
        idempotency_id: idempotency_id,
        application_id: application_id,
        ...(fraud_session_id && { fraud_session_id })
      }
    };

    console.log('Creating Finix Transfer for Apple Pay payment');
    const transferResponse = await fetch(`${finixApiUrl}/transfers`, {
      method: 'POST',
      headers: finixHeaders,
      body: JSON.stringify(transferPayload),
    });

    const transferData: FinixTransferResponse = await transferResponse.json();

    // Update payment record with transfer details
    const transferSuccess = transferResponse.ok && transferData.state === 'SUCCEEDED';
    
    await supabase
      .from('payment_history')
      .update({
        finix_transfer_id: transferData.id,
        payment_status: transferSuccess ? 'completed' : 'failed',
        finix_raw_response: transferData,
        processed_at: new Date().toISOString(),
        ...(transferData.failure_code && { 
          failure_reason: `${transferData.failure_code}: ${transferData.failure_message}` 
        })
      })
      .eq('id', paymentRecord.id);

    if (!transferSuccess) {
      console.error('Transfer failed:', transferData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: transferData.failure_message || 'Payment processing failed',
          payment_id: paymentRecord.id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update service application with payment details
    await supabase
      .from('municipal_service_applications')
      .update({
        payment_status: 'paid',
        status: 'under_review',
        payment_processed_at: new Date().toISOString(),
        amount_cents: total_amount_cents,
        payment_method_type: 'apple_pay'
      })
      .eq('id', application_id);

    console.log('Apple Pay service application payment completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentRecord.id,
        transfer_id: transferData.id,
        payment_status: 'completed',
        redirect_url: `/payment-confirmation?payment_id=${paymentRecord.id}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Service application Apple Pay payment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});