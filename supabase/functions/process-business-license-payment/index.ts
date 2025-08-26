import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessBusinessLicensePaymentRequest {
  license_id: string;
  payment_instrument_id: string;
  total_amount_cents: number;
  idempotency_id: string;
  fraud_session_id?: string;
}

interface FinixTransferRequest {
  amount: number;
  currency: string;
  destination: string;
  source: string;
  tags?: Record<string, any>;
  processor?: string;
  fee?: {
    fixed: number;
    rate: number;
  };
  statement_descriptor?: string;
  fraud_session_id?: string;
}

interface FinixTransferResponse {
  id: string;
  state: string;
  amount: number;
  currency: string;
  source: string;
  destination: string;
  fee: number;
  statement_descriptor?: string;
  tags?: Record<string, any>;
  trace_id?: string;
  failure_code?: string;
  failure_message?: string;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client with anon key for user authentication
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  // Create Supabase client with service role for admin operations
  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('Processing business license payment request');

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const body: ProcessBusinessLicensePaymentRequest = await req.json();
    const {
      license_id,
      payment_instrument_id,
      total_amount_cents,
      idempotency_id,
      fraud_session_id
    } = body;

    console.log('Request data:', {
      license_id,
      payment_instrument_id,
      total_amount_cents,
      idempotency_id,
      fraud_session_id: fraud_session_id ? 'present' : 'missing'
    });

    // Validate required parameters
    if (!license_id || !payment_instrument_id || !total_amount_cents || !idempotency_id) {
      throw new Error('Missing required parameters');
    }

    // Check for duplicate idempotency ID
    const { data: existingPayment } = await supabaseService
      .from('payment_history')
      .select('id, payment_status')
      .eq('idempotency_id', idempotency_id)
      .single();

    if (existingPayment) {
      console.log('Duplicate payment attempt detected:', idempotency_id);
      return new Response(
        JSON.stringify({
          success: existingPayment.payment_status === 'paid',
          error: existingPayment.payment_status === 'paid' 
            ? null 
            : 'Payment already processed',
          payment_id: existingPayment.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get business license details
    const { data: license, error: licenseError } = await supabaseService
      .from('business_license_applications')
      .select(`
        *,
        merchant:merchants(
          finix_merchant_id,
          finix_identity_id,
          merchant_name,
          category,
          subcategory,
          statement_descriptor
        )
      `)
      .eq('id', license_id)
      .single();

    if (licenseError || !license) {
      console.error('Error fetching license:', licenseError);
      throw new Error('Business license not found');
    }

    console.log('Business license found:', {
      id: license.id,
      status: license.application_status,
      merchant_id: license.merchant_id
    });

    // Verify license belongs to user
    if (license.user_id !== user.id) {
      throw new Error('Unauthorized access to business license');
    }

    // Verify license is in approved status (ready for payment)
    if (license.application_status !== 'approved') {
      throw new Error('Business license is not approved for payment');
    }

    // Get payment instrument details
    const { data: paymentInstrument, error: instrumentError } = await supabaseService
      .from('user_payment_instruments')
      .select('*')
      .eq('id', payment_instrument_id)
      .eq('user_id', user.id)
      .eq('enabled', true)
      .single();

    if (instrumentError || !paymentInstrument) {
      console.error('Error fetching payment instrument:', instrumentError);
      throw new Error('Payment instrument not found or not accessible');
    }

    console.log('Payment instrument found:', {
      id: paymentInstrument.id,
      type: paymentInstrument.instrument_type
    });

    // Calculate service fees
    const licenseAmount = license.base_fee_cents || license.total_amount_cents || 0;
    const isCard = paymentInstrument.instrument_type === 'PAYMENT_CARD';
    
    // Use merchant fee data or fallback defaults
    const basisPoints = isCard ? (license.basis_points || 250) : (license.ach_basis_points || 20);
    const fixedFee = isCard ? (license.fixed_fee || 50) : (license.ach_fixed_fee || 50);
    
    // Calculate grossed-up amount
    const percentageDecimal = basisPoints / 10000;
    const calculatedTotal = Math.round((licenseAmount + fixedFee) / (1 - percentageDecimal));
    const serviceFeeAmount = calculatedTotal - licenseAmount;

    // Validate the provided total matches our calculation
    if (Math.abs(total_amount_cents - calculatedTotal) > 1) {
      console.error('Total amount mismatch:', {
        provided: total_amount_cents,
        calculated: calculatedTotal,
        difference: Math.abs(total_amount_cents - calculatedTotal)
      });
      throw new Error('Total amount validation failed');
    }

    console.log('Fee calculation:', {
      licenseAmount,
      serviceFeeAmount,
      totalAmount: calculatedTotal,
      isCard,
      basisPoints,
      fixedFee
    });

    // Get user profile for payment record
    const { data: userProfile } = await supabaseService
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    // Create payment history record
    const paymentHistoryData = {
      user_id: user.id,
      customer_id: license.customer_id,
      amount_cents: licenseAmount,
      service_fee_cents: serviceFeeAmount,
      total_amount_cents: calculatedTotal,
      finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
      finix_merchant_id: license.finix_merchant_id,
      currency: 'USD',
      payment_type: isCard ? 'card' : 'ach',
      transfer_state: 'PENDING',
      idempotency_id,
      fraud_session_id,
      card_brand: paymentInstrument.card_brand,
      card_last_four: paymentInstrument.card_last_four,
      bank_last_four: paymentInstrument.bank_last_four,
      merchant_name: license.merchant?.merchant_name,
      category: license.merchant?.category,
      subcategory: license.merchant?.subcategory,
      statement_descriptor: license.merchant?.statement_descriptor,
      customer_first_name: userProfile?.first_name,
      customer_last_name: userProfile?.last_name,
      customer_email: userProfile?.email,
      payment_status: 'pending'
    };

    const { data: paymentHistory, error: paymentHistoryError } = await supabaseService
      .from('payment_history')
      .insert(paymentHistoryData)
      .select()
      .single();

    if (paymentHistoryError) {
      console.error('Error creating payment history:', paymentHistoryError);
      throw new Error('Failed to create payment record');
    }

    console.log('Payment history created:', paymentHistory.id);

    // Prepare Finix transfer request
    const finixTransferRequest: FinixTransferRequest = {
      amount: calculatedTotal,
      currency: 'USD',
      destination: license.finix_merchant_id!,
      source: paymentInstrument.finix_payment_instrument_id,
      tags: {
        business_license_id: license_id,
        payment_history_id: paymentHistory.id,
        user_id: user.id,
        idempotency_id
      },
      statement_descriptor: license.merchant?.statement_descriptor || 'License Fee',
      fraud_session_id
    };

    console.log('Creating Finix transfer:', {
      amount: finixTransferRequest.amount,
      destination: finixTransferRequest.destination,
      source: finixTransferRequest.source
    });

    // Call Finix API
    const finixResponse = await fetch('https://finix.sandbox-payments-api.com/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.json+api',
        'Authorization': `Basic ${btoa(`${Deno.env.get('FINIX_USERNAME')}:${Deno.env.get('FINIX_PASSWORD')}`)}`,
      },
      body: JSON.stringify(finixTransferRequest),
    });

    const finixData: FinixTransferResponse = await finixResponse.json();

    console.log('Finix API response:', {
      id: finixData.id,
      state: finixData.state,
      amount: finixData.amount
    });

    // Update payment history with Finix response
    const paymentUpdateData = {
      finix_transfer_id: finixData.id,
      transfer_state: finixData.state,
      finix_response: finixData,
      payment_status: finixData.state === 'SUCCEEDED' ? 'paid' : 'pending',
      finix_failure_code: finixData.failure_code,
      finix_failure_message: finixData.failure_message,
      processed_at: new Date().toISOString()
    };

    await supabaseService
      .from('payment_history')
      .update(paymentUpdateData)
      .eq('id', paymentHistory.id);

    // If payment succeeded, update business license status
    if (finixData.state === 'SUCCEEDED') {
      console.log('Payment succeeded, updating business license status');
      
      await supabaseService
        .from('business_license_applications')
        .update({
          payment_status: 'paid',
          application_status: 'issued',
          transfer_state: finixData.state,
          issued_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', license_id);
    }

    const response = {
      success: finixData.state === 'SUCCEEDED',
      payment_id: paymentHistory.id,
      finix_transfer_id: finixData.id,
      status: finixData.state,
      error: finixData.failure_message || null
    };

    console.log('Response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing business license payment:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});