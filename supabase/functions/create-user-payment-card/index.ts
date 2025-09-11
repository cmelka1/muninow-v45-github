import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Account type mapping utility for Finix identity resolution
function mapAccountTypeForFinix(accountType: string): string {
  const mapping: Record<string, string> = {
    'residentadmin': 'resident',
    'residentuser': 'resident',
    'businessadmin': 'business', 
    'businessuser': 'business',
    'municipaladmin': 'municipal',
    'municipaluser': 'municipal',
    'superadmin': 'business'
  };
  
  const mappedType = mapping[accountType?.toLowerCase()];
  console.log(`Account type mapping: ${accountType} → ${mappedType || 'resident'}`);
  return mappedType || 'resident';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCardRequest {
  cardholderName: string;
  cardNickname?: string;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user profile and Finix identity
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: finixIdentity, error: identityError } = await supabaseClient
      .from('finix_identities')
      .select('finix_identity_id, finix_application_id')
      .eq('user_id', user.id)
      .eq('account_type', mapAccountTypeForFinix(profile.account_type))
      .single();

    if (identityError || !finixIdentity) {
      return new Response(
        JSON.stringify({ error: 'Finix identity not found. Please complete your profile setup first.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Parse request body
    const requestData: CreateCardRequest = await req.json();

    // Prepare Finix API request
    const finixApiUrl = Deno.env.get('FINIX_ENVIRONMENT') === 'live' 
      ? 'https://finix.live-payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixCredentials = btoa(`${Deno.env.get('FINIX_APPLICATION_ID')}:${Deno.env.get('FINIX_API_SECRET')}`);

    const finixPayload = {
      name: requestData.cardholderName,
      number: requestData.cardNumber,
      expiration_month: parseInt(requestData.expirationMonth),
      expiration_year: parseInt(requestData.expirationYear),
      security_code: requestData.securityCode,
      type: "PAYMENT_CARD",
      address: {
        line1: requestData.streetAddress,
        city: requestData.city,
        region: requestData.state,
        postal_code: requestData.zipCode,
        country: requestData.country || 'USA'
      },
      identity: finixIdentity.finix_identity_id
    };

    // Create payment instrument via Finix API
    const finixResponse = await fetch(`${finixApiUrl}/payment_instruments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${finixCredentials}`,
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(finixPayload)
    });

    const finixData = await finixResponse.json();

    if (!finixResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment card',
          details: finixData 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if this is the user's first payment instrument to set as default
    const { count } = await supabaseClient
      .from('user_payment_instruments')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('enabled', true);

    const isFirst = count === 0;

    // If this will be the default, clear any existing defaults first
    if (isFirst) {
      await supabaseClient
        .from('user_payment_instruments')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('enabled', true);
    }

    // Extract last four digits from card number or Finix response
    const lastFour = finixData.last_four || requestData.cardNumber.slice(-4);

    // Save to user_payment_instruments table
    const { data: savedInstrument, error: saveError } = await supabaseClient
      .from('user_payment_instruments')
      .insert({
        user_id: user.id,
        finix_payment_instrument_id: finixData.id,
        finix_identity_id: finixIdentity.finix_identity_id,
        finix_application_id: finixIdentity.finix_application_id,
        instrument_type: 'PAYMENT_CARD',
        currency: finixData.currency || 'USD',
        enabled: finixData.enabled ?? true,
        status: 'active',
        created_via: finixData.created_via || 'API',
        
        // User experience fields
        nickname: requestData.cardNickname || null,
        is_default: isFirst,
        
        // Card-specific fields
        card_brand: finixData.brand,
        card_type: finixData.card_type,
        card_last_four: lastFour,
        card_expiration_month: finixData.expiration_month,
        card_expiration_year: finixData.expiration_year,
        card_name: finixData.name || requestData.cardholderName,
        card_issuer_country: finixData.issuer_country,
        card_network_token_enabled: finixData.network_token_enabled ?? false,
        card_network_token_state: finixData.network_token_state,
        card_address_verification: finixData.address_verification,
        card_security_code_verification: finixData.security_code_verification,
        card_account_updater_enabled: finixData.account_updater_enabled ?? false,
        
        // Billing address
        billing_address_line1: finixData.address?.line1 || requestData.streetAddress,
        billing_address_line2: finixData.address?.line2,
        billing_city: finixData.address?.city || requestData.city,
        billing_region: finixData.address?.region || requestData.state,
        billing_postal_code: finixData.address?.postal_code || requestData.zipCode,
        billing_country: finixData.address?.country || requestData.country || 'USA',
        
        // Finix metadata
        finix_fingerprint: finixData.fingerprint,
        finix_created_at: finixData.created_at,
        finix_updated_at: finixData.updated_at,
        raw_finix_response: finixData,
        finix_links: finixData._links,
        finix_tags: finixData.tags || {},
        
        // Third party fields
        third_party: finixData.third_party,
        third_party_token: finixData.third_party_token
      })
      .select()
      .single();

    if (saveError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save payment card',
          details: saveError 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        paymentInstrument: savedInstrument,
        finixResponse: finixData
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});