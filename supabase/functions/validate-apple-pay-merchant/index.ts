import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateApplePayMerchantRequest {
  validation_url: string;
  merchant_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { validation_url, merchant_id }: ValidateApplePayMerchantRequest = await req.json();

    if (!validation_url || !merchant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing validation_url or merchant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating Apple Pay merchant for merchant_id: ${merchant_id}`);

    // Query merchants table to get the finix_identity_id
    const { data: merchant, error: merchantError } = await supabaseService
      .from('merchants')
      .select('finix_identity_id')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchant?.finix_identity_id) {
      console.error('Failed to get merchant finix_identity_id:', merchantError);
      return new Response(
        JSON.stringify({ error: 'Merchant not found or invalid finix_identity_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using finix_identity_id: ${merchant.finix_identity_id}`);

    // Get Apple Pay configuration from Supabase secrets
    const applePayMerchantId = Deno.env.get('APPLE_PAY_MERCHANT_ID');
    const applePayDisplayName = Deno.env.get('APPLE_PAY_DISPLAY_NAME');
    const applePayDomainName = Deno.env.get('APPLE_PAY_DOMAIN_NAME');

    if (!applePayMerchantId || !applePayDisplayName || !applePayDomainName) {
      console.error('Missing Apple Pay configuration secrets');
      return new Response(
        JSON.stringify({ error: 'Apple Pay configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Finix configuration
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');

    if (!finixApiSecret) {
      console.error('Missing Finix API secret');
      return new Response(
        JSON.stringify({ error: 'Finix configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finixBaseUrl = finixEnvironment === 'production' 
      ? 'https://finix.com' 
      : 'https://finix-sandbox-reporting.finix.com';

    // Prepare the Finix Apple Pay session request
    const finixPayload = {
      display_name: applePayDisplayName,
      domain: applePayDomainName,
      merchant_identity: merchant.finix_identity_id,
      validation_url: validation_url
    };

    console.log('Calling Finix Apple Pay session endpoint with payload:', finixPayload);

    // Call Finix Apple Pay sessions endpoint
    const finixResponse = await fetch(`${finixBaseUrl}/apple_pay_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.json+api',
        'Authorization': `Basic ${btoa(finixApiSecret + ':')}`
      },
      body: JSON.stringify(finixPayload)
    });

    if (!finixResponse.ok) {
      const errorText = await finixResponse.text();
      console.error(`Finix Apple Pay session failed: ${finixResponse.status}`, errorText);
      return new Response(
        JSON.stringify({ error: 'Apple Pay merchant validation failed', details: errorText }),
        { status: finixResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionData = await finixResponse.json();
    console.log('Apple Pay merchant validation successful');

    return new Response(
      JSON.stringify(sessionData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Apple Pay merchant validation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});