import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { processUnifiedPayment } from '../shared/unifiedPaymentProcessor.ts';
import { corsHeaders } from '../shared/cors.ts';

Deno.serve(async (req) => {
  console.log('=== UNIFIED PAYMENT REQUEST ===');
  
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

    console.log('[process-unified-payment] Authenticated user:', user.id);

    // Parse request body
    const body = await req.json();
    
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
      user_email,
      session_uuid
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

    console.log('[process-unified-payment] Processing payment:', {
      entity_type,
      entity_id,
      base_amount_cents
    });

    // Call shared payment processor
    const result = await processUnifiedPayment({
      entityType: entity_type,
      entityId: entity_id,
      customerId: customer_id,
      merchantId: merchant_id,
      baseAmountCents: base_amount_cents,
      paymentInstrumentId: payment_instrument_id,
      fraudSessionId: fraud_session_id,
      clientSessionId: session_uuid,
      userId: user.id,
      userEmail: user_email || user.email!,
      paymentType: payment_type,
      cardBrand: card_brand,
      cardLastFour: card_last_four,
      bankLastFour: bank_last_four,
      firstName: first_name,
      lastName: last_name
    }, supabase);

    console.log('[process-unified-payment] Payment result:', result.success ? 'SUCCESS' : 'FAILED');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400
    });
    
  } catch (error) {
    console.error('[process-unified-payment] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed',
      retryable: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
