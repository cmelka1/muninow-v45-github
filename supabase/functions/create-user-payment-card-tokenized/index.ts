import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const { finixToken, nickname, addressOverride } = await req.json();

    console.log('Creating payment card from Finix token:', {
      hasToken: !!finixToken,
      hasNickname: !!nickname,
      hasAddressOverride: !!addressOverride,
    });

    // Validate required fields
    if (!finixToken || !finixToken.startsWith('TK')) {
      throw new Error('Valid Finix token is required (must start with TK)');
    }

    // Get Finix credentials
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';

    if (!finixApplicationId || !finixApiSecret) {
      console.error('Missing Finix credentials');
      throw new Error('Finix payment processing is not configured');
    }

    // Initialize Supabase client with auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Get user's Finix identity ID
    const { data: finixIdentity, error: identityError } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', user.id)
      .single();

    if (identityError || !finixIdentity) {
      console.error('Finix identity not found for user:', user.id);
      throw new Error('Payment profile not found. Please complete your profile setup.');
    }

    console.log('Finix identity found:', finixIdentity.finix_identity_id);

    // Prepare payment instrument data
    const paymentInstrumentData: any = {
      type: "TOKEN",
      token: finixToken,
      identity: finixIdentity.finix_identity_id,
    };

    // Add address override if provided
    if (addressOverride) {
      paymentInstrumentData.address = {
        line1: addressOverride.streetAddress,
        city: addressOverride.city,
        region: addressOverride.state,
        postal_code: addressOverride.zipCode,
        country: addressOverride.country || 'USA',
      };
    }

    console.log('Creating Finix payment instrument with token...');

    // Create payment instrument via Finix API
    const finixUrl = finixEnvironment === 'live'
      ? `https://finix.live/payment_instruments`
      : `https://finix.sandbox-payments-api.com/payment_instruments`;

    const finixResponse = await fetch(finixUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.json+api',
        'Authorization': 'Basic ' + btoa(`${finixApplicationId}:${finixApiSecret}`),
        'Finix-Version': '2022-02-01',
      },
      body: JSON.stringify(paymentInstrumentData),
    });

    if (!finixResponse.ok) {
      const errorText = await finixResponse.text();
      console.error('Finix API error response:', errorText);
      throw new Error(`Finix API error: ${finixResponse.status} ${finixResponse.statusText}`);
    }

    const paymentInstrument = await finixResponse.json();
    console.log('Payment instrument created:', paymentInstrument.id);

    // Extract card details
    const cardBrand = paymentInstrument.brand || 'UNKNOWN';
    const cardLastFour = paymentInstrument.last_four || '0000';
    const cardExpMonth = paymentInstrument.expiration_month;
    const cardExpYear = paymentInstrument.expiration_year;

    // Generate display name
    const displayName = nickname || `${cardBrand} •••• ${cardLastFour}`;

    // Check if this should be the default payment method
    const { count } = await supabase
      .from('user_payment_instruments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('enabled', true);

    const isDefault = count === 0;

    // Store in user_payment_instruments
    const { data: savedInstrument, error: saveError } = await supabase
      .from('user_payment_instruments')
      .insert({
        user_id: user.id,
        finix_payment_instrument_id: paymentInstrument.id,
        finix_identity_id: finixIdentity.finix_identity_id,
        instrument_type: 'PAYMENT_CARD',
        nickname: nickname || null,
        is_default: isDefault,
        enabled: true,
        status: 'active',
        card_brand: cardBrand,
        card_last_four: cardLastFour,
        card_expiration_month: cardExpMonth,
        card_expiration_year: cardExpYear,
        billing_address_line1: addressOverride?.streetAddress || paymentInstrument.address?.line1,
        billing_city: addressOverride?.city || paymentInstrument.address?.city,
        billing_region: addressOverride?.state || paymentInstrument.address?.region,
        billing_postal_code: addressOverride?.zipCode || paymentInstrument.address?.postal_code,
        raw_finix_response: paymentInstrument,
        created_via: 'tokenized_form',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving payment instrument:', saveError);
      throw new Error('Failed to save payment method');
    }

    console.log('Payment method saved successfully:', savedInstrument.id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentInstrument: savedInstrument,
        message: 'Payment card added successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating payment card from token:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add payment card',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
