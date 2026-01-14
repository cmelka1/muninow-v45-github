import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../shared/cors.ts';
import { FinixAPI } from '../shared/finixAPI.ts';
import { processUnifiedPayment } from '../shared/unifiedPaymentProcessor.ts';
import { Logger } from '../shared/logger.ts';
import {
  validateApplePayRequest,
  fetchUserFinixIdentity,
  fetchMerchantFinixData,
  formatApplePayBillingAddress
} from '../shared/applePayHelpers.ts';

Deno.serve(async (req) => {
  Logger.info('=== APPLE PAY PAYMENT REQUEST ===');

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

    // Verify JWT and get user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      Logger.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      Logger.error('User not authenticated', authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Your session has expired. Please refresh the page and sign in again.',
          retryable: false
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    Logger.info('Authenticated user', { userId: user.id });

    // Parse and validate request body
    const body = await req.json();
    Logger.info('Request body', {
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      merchant_id: body.merchant_id,
      base_amount_cents: body.base_amount_cents,
      has_apple_pay_token: !!body.apple_pay_token,
      authenticated_user_id: user.id
    });

    if (!validateApplePayRequest(body)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch user's Finix BUYER identity
    const userFinixIdentity = await fetchUserFinixIdentity(supabase, user.id);
    if (!userFinixIdentity) {
      Logger.error('User has no Finix BUYER identity');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment profile not set up. Please add a payment method first.' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch merchant Finix data
    const merchantData = await fetchMerchantFinixData(supabase, body.merchant_id);
    if (!merchantData) {
      Logger.error('Merchant not found or incomplete');
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate merchant identity format
    if (!merchantData.finixIdentityId.startsWith('ID')) {
      Logger.error('Invalid finix_identity_id format', { 
        expected: 'ID...', 
        got: merchantData.finixIdentityId 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Merchant has invalid Finix Identity ID. Must start with "ID".'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    Logger.info('Merchant identity validation passed', { 
      identityId: merchantData.finixIdentityId.substring(0, 6) + '...' + merchantData.finixIdentityId.slice(-6)
    });

    // Parse Apple Pay token
    let applePayToken;
    try {
      applePayToken = typeof body.apple_pay_token === 'string'
        ? JSON.parse(body.apple_pay_token)
        : body.apple_pay_token;
    } catch {
      Logger.error('Invalid Apple Pay token format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Apple Pay token' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract billing address
    const billingAddress = formatApplePayBillingAddress(applePayToken);
    Logger.info('Billing address extracted', {
      city: billingAddress.city,
      state: billingAddress.state,
      postal_code: billingAddress.postal_code
    });

    // Log token structure for debugging
    Logger.debug('Apple Pay token structure', {
      hasToken: !!applePayToken.token,
      hasPaymentData: !!applePayToken.paymentData,
      tokenKeys: Object.keys(applePayToken),
      nestedTokenKeys: applePayToken.token ? Object.keys(applePayToken.token) : []
    });

    // Create payment instrument with Finix
    Logger.info('Creating payment instrument with Finix...');
    const finixAPI = new FinixAPI();
    const instrumentResult = await finixAPI.createPaymentInstrument({
      type: 'APPLE_PAY',
      identity: userFinixIdentity,
      merchantIdentity: merchantData.finixIdentityId,
      applePayToken: applePayToken
    });

    if (!instrumentResult.success || !instrumentResult.id) {
      Logger.error('Failed to create payment instrument', instrumentResult.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: instrumentResult.error || 'Failed to process Apple Pay token' 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    Logger.info('Payment instrument created', { id: instrumentResult.id });

    // Process payment using unified processor
    Logger.info('Processing payment...');
    Logger.debug('Payment details', {
      userId: user.id,
      userFinixIdentity: userFinixIdentity
    });
    
    const paymentResult = await processUnifiedPayment({
      entityType: body.entity_type as 'permit' | 'business_license' | 'service_application' | 'tax_submission',
      entityId: body.entity_id,
      merchantId: body.merchant_id,
      baseAmountCents: body.base_amount_cents,
      paymentInstrumentId: instrumentResult.id,
      paymentType: 'apple-pay',
      cardBrand: instrumentResult.card_brand,
      cardLastFour: instrumentResult.last_four,
      bankLastFour: undefined,
      userId: user.id,
      userEmail: billingAddress.email || user.email || '',
      firstName: billingAddress.first_name || user.user_metadata?.first_name || 'Apple Pay',
      lastName: billingAddress.last_name || user.user_metadata?.last_name || 'User',
      fraudSessionId: body.fraud_session_id || `applepay_${Date.now()}`
    }, supabase);

    Logger.info('Payment processed', {
      success: paymentResult.success,
      transaction_id: paymentResult.transaction_id
    });

    return new Response(
      JSON.stringify(paymentResult),
      { 
        status: paymentResult.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    Logger.error('CRITICAL ERROR in process-apple-pay-payment', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Apple Pay payment failed'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
