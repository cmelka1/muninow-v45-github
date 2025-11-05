import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { FinixAPI } from '../shared/finixAPI.ts';
import { processUnifiedPayment } from '../shared/unifiedPaymentProcessor.ts';
import { corsHeaders } from '../shared/cors.ts';
import { getOrCreateGuestUser } from '../shared/guestUserUtils.ts';

interface BillingAddress {
  name?: string;
  postal_code?: string;
  country_code?: string;
  address1?: string;
  locality?: string;
  administrative_area?: string;
}

Deno.serve(async (req) => {
  console.log('=== APPLE PAY PAYMENT REQUEST ===');
  
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

    // Get user from auth token (optional for guest checkout)
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    let userId: string | undefined;
    let userEmail: string | undefined;

    if (authHeader) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
      
      if (!userError && user) {
        userId = user.id;
        userEmail = user.email;
        console.log('[process-unified-apple-pay] Authenticated user:', userId);
      } else {
        console.log('[process-unified-apple-pay] Invalid token, proceeding as guest');
      }
    } else {
      console.log('[process-unified-apple-pay] Guest checkout - no auth provided');
    }

    // Parse request body
    const body = await req.json();
    
    const {
      entity_type,
      entity_id,
      customer_id,
      merchant_id,
      base_amount_cents,
      apple_pay_token,
      billing_address,
      fraud_session_id,
      session_uuid
    } = body;

    // Validate required fields
    if (!entity_type || !entity_id || !merchant_id || !apple_pay_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: entity_type, entity_id, merchant_id, apple_pay_token',
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate entity type
    const validEntityTypes = ['permit', 'business_license', 'service_application', 'tax_submission'];
    if (!validEntityTypes.includes(entity_type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`,
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[process-unified-apple-pay] Processing payment:', {
      entity_type,
      entity_id,
      merchant_id,
      base_amount_cents,
      is_guest: !userId
    });

    // Handle guest users - create temporary account if needed
    let finalUserId: string;
    let finalUserEmail: string;

    if (!userId) {
      console.log('[process-unified-apple-pay] Creating guest user for Apple Pay checkout');
      
      const billingContact = apple_pay_token.billingContact;
      const guestResult = await getOrCreateGuestUser(
        {
          firstName: billingContact?.givenName,
          lastName: billingContact?.familyName,
          email: body.guest_email, // Frontend can optionally provide this
          phone: billingContact?.phoneNumber,
          billingAddress: {
            address1: billing_address?.address1,
            city: billing_address?.locality,
            state: billing_address?.administrative_area,
            postal_code: billing_address?.postal_code
          }
        },
        supabase
      );

      if (guestResult.error || !guestResult.userId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Guest user creation failed: ${guestResult.error}`,
            retryable: false
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      finalUserId = guestResult.userId;
      finalUserEmail = `guest-${finalUserId}@muninow.guest`;
      
      console.log('[process-unified-apple-pay] Guest user created:', {
        userId: finalUserId,
        isNew: guestResult.isNew,
        finixIdentityId: guestResult.finixIdentityId
      });
    } else {
      finalUserId = userId;
      finalUserEmail = userEmail || '';
    }

    // Fetch merchant Finix identity
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('finix_merchant_id, finix_identity_id')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchantData?.finix_identity_id) {
      console.error('[process-unified-apple-pay] Merchant not found:', merchantError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Merchant not found',
          retryable: false
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch user Finix identity (should exist from guest creation or existing user)
    const { data: userIdentity, error: identityError } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', finalUserId)
      .eq('identity_type', 'BUYER')
      .single();

    if (identityError || !userIdentity?.finix_identity_id) {
      console.error('[process-unified-apple-pay] User Finix BUYER identity not found:', identityError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to establish payment identity. Please try again.',
          retryable: true
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const finixMerchantIdentity = merchantData.finix_identity_id;
    const finixUserIdentity = userIdentity.finix_identity_id;

    console.log('[process-unified-apple-pay] Finix identities:', {
      merchant: finixMerchantIdentity,
      user: finixUserIdentity
    });

    // Extract billing details from Apple Pay token or provided billing_address
    const billingContact = apple_pay_token.billingContact;
    const billingName = billing_address?.name || 
      (billingContact ? `${billingContact.givenName || ''} ${billingContact.familyName || ''}`.trim() : undefined);
    
    const billingAddressData: BillingAddress = {
      name: billingName,
      postal_code: billing_address?.postal_code || billingContact?.postalCode || '',
      country_code: billing_address?.country_code || billingContact?.countryCode || 'US',
      locality: billing_address?.locality || billingContact?.locality,
      administrative_area: billing_address?.administrative_area || billingContact?.administrativeArea,
      address1: billing_address?.address1
    };

    console.log('[process-unified-apple-pay] Billing address:', billingAddressData);

    // Create payment instrument via Finix
    console.log('[process-unified-apple-pay] Creating payment instrument with Apple Pay token...');
    
    const finixAPI = new FinixAPI();
    
    // Stringify the Apple Pay token for Finix
    const applePayTokenString = JSON.stringify({ token: apple_pay_token.token });
    
    const instrumentResult = await finixAPI.createPaymentInstrument({
      type: 'APPLE_PAY',
      identity: finixUserIdentity,
      merchantIdentity: finixMerchantIdentity,
      applePayToken: applePayTokenString,
      billingAddress: billingAddressData
    });

    if (!instrumentResult.success || !instrumentResult.id) {
      console.error('[process-unified-apple-pay] Failed to create payment instrument:', instrumentResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: instrumentResult.error || 'Failed to create payment instrument',
          retryable: true
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[process-unified-apple-pay] Payment instrument created:', instrumentResult.id);

    // Extract card details if available
    const cardBrand = instrumentResult.card_brand;
    const cardLastFour = instrumentResult.last_four;

    // Process payment using unified payment processor
    const result = await processUnifiedPayment({
      entityType: entity_type,
      entityId: entity_id,
      customerId: customer_id || finalUserId,
      merchantId: merchant_id,
      baseAmountCents: base_amount_cents,
      paymentInstrumentId: instrumentResult.id,
      fraudSessionId: fraud_session_id,
      clientSessionId: session_uuid,
      userId: finalUserId,
      userEmail: finalUserEmail,
      paymentType: 'apple-pay',
      cardBrand: cardBrand,
      cardLastFour: cardLastFour,
      firstName: billingContact?.givenName,
      lastName: billingContact?.familyName
    }, supabase);

    console.log('[process-unified-apple-pay] Payment result:', result.success ? 'SUCCESS' : 'FAILED');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400
    });
    
  } catch (error) {
    console.error('[process-unified-apple-pay] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Apple Pay payment processing failed',
      retryable: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
