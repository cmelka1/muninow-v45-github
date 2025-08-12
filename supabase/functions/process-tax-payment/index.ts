import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessTaxPaymentRequest {
  taxSubmissionId: string;
  paymentInstrumentId: string;
  idempotencyId: string;
  fraudSessionId?: string;
}

interface FinixTransferRequest {
  amount: number;
  currency: string;
  destination: string;
  source: string;
  tags?: Record<string, string>;
  fraud_session_id?: string;
}

interface FinixTransferResponse {
  id: string;
  amount: number;
  currency: string;
  state: string;
  failure_code?: string;
  failure_message?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase clients
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Parse request body
    const { taxSubmissionId, paymentInstrumentId, idempotencyId, fraudSessionId }: ProcessTaxPaymentRequest = await req.json();

    console.log('Processing tax payment:', { taxSubmissionId, paymentInstrumentId, idempotencyId });

    // Check for duplicate idempotency ID
    const { data: existingPayment } = await supabaseServiceRole
      .from('payment_history')
      .select('id, transfer_state')
      .eq('idempotency_id', idempotencyId)
      .single();

    if (existingPayment) {
      console.log('Duplicate idempotency ID detected:', idempotencyId);
      return new Response(
        JSON.stringify({ 
          error: 'Payment already processed',
          transfer_state: existingPayment.transfer_state 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch tax submission details
    const { data: taxSubmission, error: taxSubmissionError } = await supabaseServiceRole
      .from('tax_submissions')
      .select(`
        *,
        tax_calculations!inner(*)
      `)
      .eq('id', taxSubmissionId)
      .eq('user_id', user.id)
      .single();

    if (taxSubmissionError || !taxSubmission) {
      throw new Error('Tax submission not found or access denied');
    }

    if (taxSubmission.payment_status === 'paid') {
      throw new Error('Tax submission already paid');
    }

    // Fetch payment instrument details
    const { data: paymentInstrument, error: piError } = await supabaseServiceRole
      .from('user_payment_instruments')
      .select('*')
      .eq('id', paymentInstrumentId)
      .eq('user_id', user.id)
      .eq('enabled', true)
      .single();

    if (piError || !paymentInstrument) {
      throw new Error('Payment instrument not found or access denied');
    }

    // Fetch merchant details
    const { data: merchant, error: merchantError } = await supabaseServiceRole
      .from('merchants')
      .select(`
        *,
        merchant_fee_profiles!inner(*)
      `)
      .eq('id', taxSubmission.merchant_id)
      .single();

    if (merchantError || !merchant) {
      throw new Error('Merchant not found');
    }

    const feeProfile = merchant.merchant_fee_profiles[0];
    if (!feeProfile) {
      throw new Error('Merchant fee profile not found');
    }

    // Calculate service fees using grossed-up method
    const baseAmount = taxSubmission.amount_cents;
    let serviceFee: number;
    let totalAmount: number;

    if (paymentInstrument.instrument_type === 'PAYMENT_CARD') {
      const percentageRate = feeProfile.basis_points / 10000;
      const fixedFee = feeProfile.fixed_fee || 0;
      
      // Grossed-up calculation: total = (base + fixed) / (1 - percentage)
      totalAmount = Math.round((baseAmount + fixedFee) / (1 - percentageRate));
      serviceFee = totalAmount - baseAmount;
    } else {
      // ACH
      const percentageRate = feeProfile.ach_basis_points / 10000;
      const fixedFee = feeProfile.ach_fixed_fee || 0;
      
      totalAmount = Math.round((baseAmount + fixedFee) / (1 - percentageRate));
      serviceFee = totalAmount - baseAmount;
    }

    console.log('Fee calculation:', { baseAmount, serviceFee, totalAmount });

    // Create payment history record with PENDING status
    const { data: paymentRecord, error: paymentError } = await supabaseServiceRole
      .from('payment_history')
      .insert({
        user_id: user.id,
        customer_id: taxSubmission.customer_id,
        amount_cents: baseAmount,
        service_fee_cents: serviceFee,
        total_amount_cents: totalAmount,
        finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        finix_merchant_id: merchant.finix_merchant_id,
        currency: 'USD',
        payment_type: paymentInstrument.instrument_type,
        transfer_state: 'PENDING',
        idempotency_id: idempotencyId,
        fraud_session_id: fraudSessionId,
        card_brand: paymentInstrument.card_brand,
        card_last_four: paymentInstrument.card_last_four,
        bank_last_four: paymentInstrument.bank_last_four,
        merchant_name: merchant.merchant_name,
        category: taxSubmission.category,
        subcategory: taxSubmission.subcategory,
        statement_descriptor: merchant.statement_descriptor,
        customer_first_name: taxSubmission.first_name,
        customer_last_name: taxSubmission.last_name,
        customer_email: user.email,
        payment_status: 'pending',
        tax_submission_id: taxSubmissionId
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      throw new Error('Failed to create payment record');
    }

    // Prepare Finix transfer request
    const transferRequest: FinixTransferRequest = {
      amount: totalAmount,
      currency: 'USD',
      destination: merchant.finix_merchant_id,
      source: paymentInstrument.finix_payment_instrument_id,
      tags: {
        tax_submission_id: taxSubmissionId,
        payment_history_id: paymentRecord.id,
        tax_type: taxSubmission.tax_type,
        user_id: user.id
      }
    };

    if (fraudSessionId) {
      transferRequest.fraud_session_id = fraudSessionId;
    }

    console.log('Creating Finix transfer:', transferRequest);

    // Make request to Finix API
    const finixResponse = await fetch('https://finix.sandbox-payments-api.com/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.json+api',
        'Authorization': `Basic ${btoa(Deno.env.get('FINIX_USERNAME') + ':' + Deno.env.get('FINIX_PASSWORD'))}`
      },
      body: JSON.stringify(transferRequest)
    });

    const finixData: FinixTransferResponse = await finixResponse.json();
    console.log('Finix response:', finixData);

    // Update payment history with Finix response
    const updateData: any = {
      finix_transfer_id: finixData.id,
      transfer_state: finixData.state,
      raw_finix_response: finixData,
      finix_created_at: finixData.created_at,
      finix_updated_at: finixData.updated_at
    };

    if (finixData.failure_code) {
      updateData.failure_code = finixData.failure_code;
      updateData.failure_message = finixData.failure_message;
      updateData.payment_status = 'failed';
    } else if (finixData.state === 'SUCCEEDED') {
      updateData.payment_status = 'paid';
    }

    const { error: updateError } = await supabaseServiceRole
      .from('payment_history')
      .update(updateData)
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
    }

    // Update tax submission if payment succeeded
    if (finixData.state === 'SUCCEEDED') {
      const { error: taxUpdateError } = await supabaseServiceRole
        .from('tax_submissions')
        .update({
          payment_status: 'paid',
          transfer_state: 'SUCCEEDED',
          finix_transfer_id: finixData.id,
          paid_at: new Date().toISOString(),
          submission_status: 'submitted'
        })
        .eq('id', taxSubmissionId);

      if (taxUpdateError) {
        console.error('Failed to update tax submission:', taxUpdateError);
      }
    } else if (finixData.failure_code) {
      // Update tax submission with failure info
      const { error: taxUpdateError } = await supabaseServiceRole
        .from('tax_submissions')
        .update({
          payment_status: 'failed',
          transfer_state: 'FAILED',
          failure_code: finixData.failure_code,
          failure_message: finixData.failure_message
        })
        .eq('id', taxSubmissionId);

      if (taxUpdateError) {
        console.error('Failed to update tax submission with failure:', taxUpdateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: finixData.state === 'SUCCEEDED',
        transfer_id: finixData.id,
        transfer_state: finixData.state,
        payment_history_id: paymentRecord.id,
        amount_cents: totalAmount,
        failure_code: finixData.failure_code,
        failure_message: finixData.failure_message
      }),
      {
        status: finixData.state === 'SUCCEEDED' ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Tax payment processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process tax payment' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});