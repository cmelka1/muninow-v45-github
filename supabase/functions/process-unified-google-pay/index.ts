import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { classifyPaymentError, generateIdempotencyId } from '../shared/paymentUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BillingAddress {
  name?: string;
  postal_code?: string;
  country_code?: string;
  address1?: string;
  address2?: string;
  locality?: string;
  administrative_area?: string;
}

interface UnifiedGooglePayRequest {
  entity_type: 'permit'; // Only permit for now - will expand later
  entity_id: string;
  customer_id: string;
  merchant_id: string;
  base_amount_cents: number;
  google_pay_token: string;
  billing_address?: BillingAddress;
  fraud_session_id?: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
}

interface UnifiedGooglePayResponse {
  success: boolean;
  transaction_id?: string;
  finix_transfer_id?: string;
  finix_payment_instrument_id?: string;
  service_fee_cents?: number;
  total_amount_cents?: number;
  error?: string;
  retryable?: boolean;
}

interface FinixPaymentInstrumentRequest {
  identity: string;
  merchant_identity: string;
  name?: string;
  third_party_token: string;
  type: "GOOGLE_PAY";
  address?: {
    country?: string;
    postal_code?: string;
  };
}

interface FinixPaymentInstrumentResponse {
  id: string;
  name: string;
  type: string;
  card?: {
    brand?: string;
    last_four?: string;
  };
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface FinixTransferRequest {
  merchant: string;
  currency: string;
  amount: number;
  source: string;
  fraud_session_id?: string;
  idempotency_id: string;
}

interface FinixTransferResponse {
  id: string;
  amount: number;
  state: string;
  currency: string;
  source: string;
  merchant: string;
  created_at: string;
  updated_at: string;
  failure_code?: string;
  failure_message?: string;
  fee?: number;
  statement_descriptor?: string;
  [key: string]: any;
}

Deno.serve(async (req) => {
  console.log('=== UNIFIED GOOGLE PAY REQUEST ===');
  
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
    const body: UnifiedGooglePayRequest = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const {
      entity_type,
      entity_id,
      customer_id,
      merchant_id,
      base_amount_cents,
      google_pay_token,
      billing_address,
      fraud_session_id,
      first_name,
      last_name,
      user_email
    } = body;

    // Validate required fields
    if (!entity_type || !entity_id || !customer_id || !merchant_id || !base_amount_cents || !google_pay_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Only support permits for now
    if (entity_type !== 'permit') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Only permit payments are supported in this version',
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

    console.log('Authenticated user:', user.id);

    // Get merchant information
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('finix_merchant_id, finix_identity_id, merchant_name, category, subcategory')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchant) {
      console.error('Merchant fetch error:', merchantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found', retryable: false }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!merchant.finix_merchant_id || !merchant.finix_identity_id) {
      console.error('Merchant missing Finix IDs');
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not properly configured', retryable: false }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get permit details and validate ownership
    const { data: permit, error: permitError } = await supabase
      .from('permit_applications')
      .select('*')
      .eq('permit_id', entity_id)
      .eq('user_id', user.id)
      .single();

    if (permitError || !permit) {
      console.error('Permit fetch error:', permitError);
      return new Response(
        JSON.stringify({ success: false, error: 'Permit not found or access denied', retryable: false }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate permit is in payable state (approved)
    if (permit.application_status !== 'approved') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Permit must be approved before payment can be processed',
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user's Finix identity
    const { data: userIdentity, error: identityError } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', user.id)
      .single();

    if (identityError || !userIdentity) {
      console.error('User identity fetch error:', identityError);
      return new Response(
        JSON.stringify({ success: false, error: 'User identity not found. Please complete payment setup first.', retryable: false }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Generate idempotency ID
    const idempotency_id = generateIdempotencyId('unified_google_pay', entity_id);
    console.log('Generated idempotency ID:', idempotency_id);

    // STEP 1: Create payment transaction record FIRST (atomic approach)
    console.log('=== CREATING PAYMENT TRANSACTION RECORD ===');
    
    const { data: feeCalcResult, error: feeCalcError } = await supabase.rpc(
      'create_unified_payment_transaction',
      {
        p_user_id: user.id,
        p_customer_id: customer_id,
        p_merchant_id: merchant_id,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_base_amount_cents: base_amount_cents,
        p_payment_instrument_id: '', // Will be set after creating Finix payment instrument
        p_payment_type: 'google-pay',
        p_fraud_session_id: fraud_session_id || null,
        p_idempotency_id: idempotency_id,
        p_is_card: true, // Google Pay is considered a card payment
        p_card_brand: null, // Will be updated after payment instrument creation
        p_card_last_four: null,
        p_bank_last_four: null,
        p_first_name: first_name || null,
        p_last_name: last_name || null,
        p_user_email: user_email || user.email || null
      }
    );

    if (feeCalcError || !feeCalcResult?.success) {
      console.error('Fee calculation error:', feeCalcError, feeCalcResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: feeCalcResult?.error || 'Failed to calculate fees',
          retryable: true
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const serviceFeeFromDB = feeCalcResult.service_fee_cents;
    const totalAmountFromDB = feeCalcResult.total_amount_cents;
    const transactionId = feeCalcResult.transaction_id;

    console.log('Database fee calculation:', {
      service_fee: serviceFeeFromDB,
      total_amount: totalAmountFromDB,
      transaction_id: transactionId
    });

    // STEP 2: Initialize Finix API
    console.log('=== INITIALIZING FINIX API ===');
    
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    if (!finixApplicationId || !finixApiSecret) {
      // ROLLBACK: Delete the payment transaction record
      await supabase
        .from('payment_transactions')
        .delete()
        .eq('id', transactionId);
        
      return new Response(
        JSON.stringify({ success: false, error: 'Finix credentials not configured', retryable: false }),
        { status: 500, headers: corsHeaders }
      );
    }

    const finixApiUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixCredentials = btoa(`${finixApplicationId}:${finixApiSecret}`);
    const finixHeaders = {
      'Authorization': `Basic ${finixCredentials}`,
      'Content-Type': 'application/json',
      'Finix-Version': '2022-02-01'
    };

    // STEP 3: Create Finix Payment Instrument from Google Pay token
    console.log('=== CREATING FINIX PAYMENT INSTRUMENT ===');
    
    const paymentInstrumentRequest: FinixPaymentInstrumentRequest = {
      identity: userIdentity.finix_identity_id,
      merchant_identity: merchant.finix_identity_id,
      third_party_token: google_pay_token,
      type: "GOOGLE_PAY"
    };
    
    // Add billing info if available
    if (billing_address?.name) {
      paymentInstrumentRequest.name = billing_address.name;
    }

    if (billing_address?.postal_code || billing_address?.country_code) {
      paymentInstrumentRequest.address = {
        country: billing_address.country_code || "USA",
        postal_code: billing_address.postal_code
      };
    }

    console.log('Creating Finix Payment Instrument:', {
      user_identity: userIdentity.finix_identity_id,
      merchant_identity: merchant.finix_identity_id,
      has_token: !!google_pay_token
    });

    const piResponse = await fetch(`${finixApiUrl}/payment_instruments`, {
      method: 'POST',
      headers: finixHeaders,
      body: JSON.stringify(paymentInstrumentRequest)
    });

    const piData: FinixPaymentInstrumentResponse = await piResponse.json();
    console.log('Finix payment instrument response:', JSON.stringify(piData, null, 2));

    if (!piResponse.ok || !piData.id) {
      console.error('Failed to create payment instrument:', piData);
      
      // ROLLBACK: Delete the payment transaction record since Finix failed
      console.log('Rolling back payment transaction record:', transactionId);
      await supabase
        .from('payment_transactions')
        .delete()
        .eq('id', transactionId);
      
      const classifiedError = classifyPaymentError(piData);
      
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

    console.log('Payment instrument created successfully:', piData.id);

    // Extract card details from Finix payment instrument response
    const cardBrand = piData.card?.brand || null;
    const cardLastFour = piData.card?.last_four || null;

    // Update payment transaction with payment instrument details
    await supabase
      .from('payment_transactions')
      .update({
        finix_payment_instrument_id: piData.id,
        card_brand: cardBrand,
        card_last_four: cardLastFour
      })
      .eq('id', transactionId);

    // STEP 4: Create Finix Transfer using the payment instrument
    console.log('=== CREATING FINIX TRANSFER ===');
    
    const transferPayload: FinixTransferRequest = {
      merchant: merchant.finix_merchant_id,
      currency: 'USD',
      amount: totalAmountFromDB,
      source: piData.id,
      idempotency_id: idempotency_id
    };

    if (fraud_session_id) {
      transferPayload.fraud_session_id = fraud_session_id;
    }

    console.log('Creating Finix transfer:', transferPayload);

    const finixResponse = await fetch(`${finixApiUrl}/transfers`, {
      method: 'POST',
      headers: finixHeaders,
      body: JSON.stringify(transferPayload)
    });

    const finixData: FinixTransferResponse = await finixResponse.json();
    console.log('Finix API response:', JSON.stringify(finixData, null, 2));

    if (!finixResponse.ok) {
      console.error('Finix transfer failed:', finixData);
      
      // ROLLBACK: Delete the payment transaction record since Finix failed
      console.log('Rolling back payment transaction record:', transactionId);
      await supabase
        .from('payment_transactions')
        .delete()
        .eq('id', transactionId);
      
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

    console.log('Finix transfer created successfully:', finixData);

    // STEP 5: Update payment record with success details and entity status atomically
    console.log('=== UPDATING PAYMENT STATUS AND ENTITY ===');
    
    const finalPaymentStatus = finixData.state === 'SUCCEEDED' ? 'paid' : 'unpaid';
    
    // Update payment transaction with Finix results
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        payment_status: finalPaymentStatus,
        transfer_state: finixData.state,
        finix_transfer_id: finixData.id,
        raw_finix_response: finixData
      })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      // Continue anyway - the payment went through
    }

    // STEP 6: Update permit status if payment succeeded
    if (finixData.state === 'SUCCEEDED') {
      console.log('=== UPDATING PERMIT STATUS ===');
      
      try {
        // Prepare update data
        const permitUpdate: any = {
          payment_status: 'paid',
          payment_processed_at: new Date().toISOString(),
          finix_transfer_id: finixData.id,
          transfer_state: 'SUCCEEDED'
        };
        
        // Auto-issue permit since it's already approved and payment succeeded
        permitUpdate.application_status = 'issued';
        permitUpdate.issued_at = new Date().toISOString();
        console.log('Auto-issuing permit after successful Google Pay payment');
        
        const { error: permitUpdateError } = await supabase
          .from('permit_applications')
          .update(permitUpdate)
          .eq('permit_id', entity_id);
          
        if (permitUpdateError) {
          console.error('Failed to update permit status:', permitUpdateError);
          
          // Mark payment transaction as failed due to entity update error
          await supabase
            .from('payment_transactions')
            .update({
              payment_status: 'failed',
              error_details: permitUpdateError
            })
            .eq('id', transactionId);
            
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Payment succeeded but failed to update permit: ${permitUpdateError.message}`,
              retryable: false
            }),
            { status: 500, headers: corsHeaders }
          );
        } else {
          console.log('Successfully updated permit status to issued after Google Pay payment');
        }
      } catch (entityError) {
        console.error('Error updating permit status:', entityError);
        // Continue anyway - the payment went through
      }
    }

    console.log('=== GOOGLE PAY PAYMENT COMPLETED SUCCESSFULLY ===');

    const response: UnifiedGooglePayResponse = {
      success: true,
      transaction_id: transactionId,
      finix_transfer_id: finixData.id,
      finix_payment_instrument_id: piData.id,
      service_fee_cents: serviceFeeFromDB,
      total_amount_cents: totalAmountFromDB
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unified Google Pay processing error:', error);
    
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