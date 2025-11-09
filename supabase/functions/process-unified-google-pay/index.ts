import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { processUnifiedPayment } from '../shared/unifiedPaymentProcessor.ts';
import { FinixAPI } from '../shared/finixAPI.ts';
import { corsHeaders } from '../shared/cors.ts';

interface BillingAddress {
  name?: string;
  postal_code?: string;
  country_code?: string;
  address1?: string;
  address2?: string;
  locality?: string;
  administrative_area?: string;
}

Deno.serve(async (req) => {
  console.log('=== UNIFIED GOOGLE PAY REQUEST ===');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth token
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', retryable: false }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('[process-unified-google-pay] Authenticated user:', user.id);

    // Parse request body
    const body = await req.json();
    
    const {
      entity_type,
      entity_id,
      merchant_id,
      base_amount_cents,
      google_pay_token,
      billing_address,
      fraud_session_id,
      first_name,
      last_name,
      user_email,
      session_uuid
    } = body;

    // Validate required fields
    if (!entity_type || !entity_id || !merchant_id || !base_amount_cents || !google_pay_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate entity type
    const supportedEntityTypes = ['permit', 'tax_submission', 'business_license', 'service_application'];
    if (!supportedEntityTypes.includes(entity_type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unsupported entity type: ${entity_type}`,
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[process-unified-google-pay] Processing Google Pay payment:', {
      entity_type,
      entity_id,
      base_amount_cents
    });

    // Get merchant information
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('finix_merchant_id, finix_identity_id')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchant || !merchant.finix_merchant_id || !merchant.finix_identity_id) {
      console.error('Merchant fetch error:', merchantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found or not properly configured', retryable: false }),
        { status: 404, headers: corsHeaders }
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

    // STEP 1: Create Finix payment instrument from Google Pay token
    console.log('[process-unified-google-pay] Creating payment instrument from Google Pay token');
    
    const finixAPI = new FinixAPI();
    const paymentInstrument = await finixAPI.createPaymentInstrument({
      type: 'GOOGLE_PAY',
      identity: userIdentity.finix_identity_id,
      merchantIdentity: merchant.finix_identity_id,
      googlePayToken: google_pay_token,
      billingAddress: billing_address
    });
    
    if (!paymentInstrument.success) {
      console.error('[process-unified-google-pay] Failed to create payment instrument:', paymentInstrument.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create payment instrument: ${paymentInstrument.error}`,
          retryable: true
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[process-unified-google-pay] Payment instrument created:', paymentInstrument.id);
    
    // STEP 2: Call shared payment processor with created payment instrument
    const result = await processUnifiedPayment({
      entityType: entity_type,
      entityId: entity_id,
      merchantId: merchant_id,
      baseAmountCents: base_amount_cents,
      paymentInstrumentId: paymentInstrument.id!,
      fraudSessionId: fraud_session_id,
      clientSessionId: session_uuid || fraud_session_id,
      userId: user.id,
      userEmail: user_email || user.email!,
      paymentType: 'google-pay',
      cardBrand: paymentInstrument.card_brand,
      cardLastFour: paymentInstrument.last_four,
      firstName: first_name,
      lastName: last_name
    }, supabase);

    console.log('[process-unified-google-pay] Payment result:', result.success ? 'SUCCESS' : 'FAILED');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400
    });
    
  } catch (error) {
    console.error('[process-unified-google-pay] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Google Pay processing failed',
      retryable: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
