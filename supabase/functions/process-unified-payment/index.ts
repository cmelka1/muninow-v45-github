import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { classifyPaymentError, generateIdempotencyId } from '../shared/paymentUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UnifiedPaymentRequest {
  entity_type: 'permit' | 'business_license' | 'tax_submission' | 'service_application';
  entity_id: string;
  customer_id: string;
  merchant_id: string;
  base_amount_cents: number;
  payment_instrument_id: string;
  payment_type: 'card' | 'ach' | 'google-pay' | 'apple-pay';
  fraud_session_id?: string;
  card_brand?: string;
  card_last_four?: string;
  bank_last_four?: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
}

interface UnifiedPaymentResponse {
  success: boolean;
  payment_history_id?: string;
  finix_transfer_id?: string;
  transaction_id?: string;
  service_fee_cents?: number;
  total_amount_cents?: number;
  error?: string;
  retryable?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const body: UnifiedPaymentRequest = await req.json();
    const {
      entity_type,
      entity_id,
      customer_id,
      merchant_id,
      base_amount_cents,
      payment_instrument_id,
      payment_type,
      fraud_session_id,
      card_brand,
      card_last_four,
      bank_last_four,
      first_name,
      last_name,
      user_email
    } = body;

    // Validate required fields
    if (!entity_type || !entity_id || !customer_id || !merchant_id || !base_amount_cents || !payment_instrument_id || !payment_type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user from auth token
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', retryable: false }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get merchant information
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('finix_merchant_id, merchant_name, category, subcategory')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchant) {
      console.error('Merchant fetch error:', merchantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found', retryable: false }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Generate idempotency ID
    const idempotency_id = generateIdempotencyId('unified_payment', entity_id);
    
    // Determine if it's a card payment
    const is_card = ['card', 'google-pay', 'apple-pay'].includes(payment_type);

    console.log('Creating unified payment transaction:', {
      entity_type,
      entity_id,
      user_id: user.id,
      customer_id,
      merchant_id,
      base_amount_cents,
      is_card,
      idempotency_id
    });

    // Create unified payment transaction in database
    const { data: transactionData, error: transactionError } = await supabase.rpc(
      'create_unified_payment_transaction',
      {
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_user_id: user.id,
        p_customer_id: customer_id,
        p_merchant_id: merchant_id,
        p_base_amount_cents: base_amount_cents,
        p_payment_instrument_id: payment_instrument_id,
        p_payment_type: payment_type,
        p_is_card: is_card,
        p_idempotency_id: idempotency_id,
        p_fraud_session_id: fraud_session_id,
        p_card_brand: card_brand,
        p_card_last_four: card_last_four,
        p_bank_last_four: bank_last_four,
        p_merchant_name: merchant.merchant_name,
        p_category: merchant.category,
        p_subcategory: merchant.subcategory,
        p_statement_descriptor: `${merchant.merchant_name} ${entity_type}`,
        p_first_name: first_name,
        p_last_name: last_name,
        p_user_email: user_email
      }
    );

    if (transactionError || !transactionData?.success) {
      console.error('Transaction creation error:', transactionError, transactionData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: transactionData?.error || 'Failed to create payment transaction',
          retryable: true
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Transaction created successfully:', transactionData);

    // Prepare Finix transfer request
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    if (!finixApplicationId || !finixApiSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Finix credentials not configured', retryable: false }),
        { status: 500, headers: corsHeaders }
      );
    }

    const finixApiUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixCredentials = btoa(`${finixApplicationId}:${finixApiSecret}`);

    // Create Finix transfer
    const transferPayload = {
      merchant: transactionData.finix_merchant_id,
      currency: 'USD',
      amount: transactionData.total_amount_cents,
      source: payment_instrument_id,
      tags: {
        entity_type,
        entity_id,
        payment_history_id: transactionData.payment_history_id,
        customer_id,
        user_id: user.id
      },
      ...(fraud_session_id && { fraud_session_id })
    };

    console.log('Creating Finix transfer:', transferPayload);

    const finixResponse = await fetch(`${finixApiUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${finixCredentials}`,
        'Content-Type': 'application/vnd.json+api',
        'Finix-Version': '2022-02-01',
        'Idempotency-ID': idempotency_id
      },
      body: JSON.stringify(transferPayload)
    });

    const finixData = await finixResponse.json();

    if (!finixResponse.ok) {
      console.error('Finix API error:', finixData);
      
      // Classify the error for appropriate handling
      const classifiedError = classifyPaymentError(finixData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: classifiedError.message,
          retryable: classifiedError.retryable,
          error_type: classifiedError.type
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Finix transfer created:', finixData);

    // Update payment status in database
    const { data: updateData, error: updateError } = await supabase.rpc(
      'update_unified_payment_status',
      {
        p_payment_history_id: transactionData.payment_history_id,
        p_finix_transfer_id: finixData.id,
        p_transfer_state: finixData.state,
        p_payment_status: finixData.state === 'SUCCEEDED' ? 'completed' : 'pending'
      }
    );

    if (updateError || !updateData) {
      console.error('Status update error:', updateError);
      // Log error but don't fail the payment since Finix succeeded
    }

    const response: UnifiedPaymentResponse = {
      success: true,
      payment_history_id: transactionData.payment_history_id,
      finix_transfer_id: finixData.id,
      transaction_id: finixData.id,
      service_fee_cents: transactionData.service_fee_cents,
      total_amount_cents: transactionData.total_amount_cents
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unified payment processing error:', error);
    
    const classifiedError = classifyPaymentError(error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: classifiedError.message,
        retryable: classifiedError.retryable,
        error_type: classifiedError.type
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});