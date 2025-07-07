import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateBankAccountRequest {
  accountHolderName: string;
  accountNickname?: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'personal_checking' | 'personal_savings' | 'business_checking' | 'business_savings';
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
      .eq('account_type', profile.account_type)
      .single();

    if (identityError || !finixIdentity) {
      return new Response(
        JSON.stringify({ error: 'Finix identity not found. Please complete your profile setup first.' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Parse request body
    const requestData: CreateBankAccountRequest = await req.json();
    console.log('Creating bank account for user:', user.id);

    // Map account type to Finix format
    const accountTypeMapping = {
      'personal_checking': 'PERSONAL_CHECKING',
      'personal_savings': 'PERSONAL_SAVINGS', 
      'business_checking': 'BUSINESS_CHECKING',
      'business_savings': 'BUSINESS_SAVINGS'
    };

    // Prepare Finix API request
    const finixApiUrl = Deno.env.get('FINIX_ENVIRONMENT') === 'live' 
      ? 'https://finix.live-payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixCredentials = btoa(`${finixIdentity.finix_application_id}:${Deno.env.get('FINIX_API_SECRET')}`);

    const finixPayload = {
      name: requestData.accountHolderName,
      account_number: requestData.accountNumber,
      bank_code: requestData.routingNumber,
      account_type: accountTypeMapping[requestData.accountType],
      type: "BANK_ACCOUNT",
      country: requestData.country || 'USA',
      currency: 'USD',
      identity: finixIdentity.finix_identity_id
    };

    console.log('Sending request to Finix API:', finixApiUrl);

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
    console.log('Finix API response status:', finixResponse.status);

    if (!finixResponse.ok) {
      console.error('Finix API error:', finixData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create bank account',
          details: finixData 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Bank account created successfully in Finix');

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

    // Extract last four digits from masked account number
    const lastFour = finixData.masked_account_number 
      ? finixData.masked_account_number.slice(-4)
      : requestData.accountNumber.slice(-4);

    // Save to user_payment_instruments table
    const { data: savedInstrument, error: saveError } = await supabaseClient
      .from('user_payment_instruments')
      .insert({
        user_id: user.id,
        finix_payment_instrument_id: finixData.id,
        finix_identity_id: finixIdentity.finix_identity_id,
        finix_application_id: finixIdentity.finix_application_id,
        instrument_type: 'BANK_ACCOUNT',
        currency: finixData.currency || 'USD',
        enabled: finixData.enabled ?? true,
        status: 'active',
        created_via: finixData.created_via || 'API',
        
        // User experience fields
        nickname: requestData.accountNickname || null,
        is_default: isFirst,
        
        // Bank account-specific fields
        bank_account_type: finixData.account_type || accountTypeMapping[requestData.accountType],
        bank_last_four: lastFour,
        bank_name: finixData.name || requestData.accountHolderName,
        bank_code: finixData.bank_code || requestData.routingNumber,
        bank_masked_account_number: finixData.masked_account_number,
        bank_account_validation_check: finixData.bank_account_validation_check,
        bank_institution_number: finixData.institution_number,
        bank_transit_number: finixData.transit_number,
        bank_country: finixData.country || requestData.country || 'USA',
        
        // Billing address (same as account holder address for bank accounts)
        billing_address_line1: requestData.streetAddress,
        billing_city: requestData.city,
        billing_region: requestData.state,
        billing_postal_code: requestData.zipCode,
        billing_country: requestData.country || 'USA',
        
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
      console.error('Error saving bank account:', saveError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save bank account',
          details: saveError 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Bank account saved successfully to database');

    return new Response(
      JSON.stringify({ 
        success: true,
        paymentInstrument: savedInstrument,
        finixResponse: finixData
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unexpected error in create-user-bank-account:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});