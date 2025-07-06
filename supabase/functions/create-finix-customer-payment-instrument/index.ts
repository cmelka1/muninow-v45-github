import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BankAccountData {
  nameOnAccount: string;
  accountNickname?: string;
  routingNumber: string;
  accountNumber: string;
}

interface RequestBody {
  customerId: string;
  bankAccount: BankAccountData;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    // Verify authentication and super admin access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify super admin access
    if (user.email !== 'cmelka@muninow.com') {
      console.error('❌ Super admin access required. User email:', user.email);
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { customerId, bankAccount } = body;

    console.log('🔄 Processing payment instrument creation for customer:', customerId);

    // Validate required fields
    if (!customerId || !bankAccount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customerId and bankAccount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate bank account data
    const { nameOnAccount, routingNumber, accountNumber, accountNickname } = bankAccount;
    if (!nameOnAccount || !routingNumber || !accountNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required bank account fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch customer data to get finix_identity_id
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('finix_identity_id, business_name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.error('❌ Customer not found:', customerError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer.finix_identity_id) {
      console.error('❌ Customer missing Finix identity ID');
      return new Response(
        JSON.stringify({ error: 'Customer does not have a Finix identity ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Finix API request
    const finixBaseUrl = Deno.env.get('FINIX_BASE_URL') || 'https://finix.sandbox-payments-api.com';
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');

    if (!finixApplicationId || !finixApiSecret) {
      console.error('❌ Missing Finix credentials');
      return new Response(
        JSON.stringify({ error: 'Finix credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Finix payment instrument payload exactly matching the example
    const finixPayload = {
      account_number: accountNumber,
      account_type: "BUSINESS_CHECKING",
      bank_code: routingNumber,
      identity: customer.finix_identity_id,
      name: nameOnAccount,
      type: "BANK_ACCOUNT"
    };

    console.log('🔄 Calling Finix API to create payment instrument...');

    // Call Finix API
    const finixResponse = await fetch(`${finixBaseUrl}/payment_instruments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`,
        'Accept': 'application/hal+json',
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(finixPayload)
    });

    const finixData = await finixResponse.json();

    if (!finixResponse.ok) {
      console.error('❌ Finix API error:', finixData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment instrument', 
          details: finixData 
        }),
        { status: finixResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Finix payment instrument created:', finixData.id);

    // Store payment instrument in database
    const paymentMethodData = {
      customer_id: customerId,
      finix_payment_instrument_id: finixData.id,
      finix_application_id: finixData.application,
      finix_identity_id: finixData.identity,
      enabled: finixData.enabled || true,
      instrument_type: finixData.type,
      account_type: finixData.account_type,
      bank_code: finixData.bank_code,
      masked_account_number: finixData.masked_account_number,
      account_holder_name: finixData.name,
      bank_account_validation_check: finixData.bank_account_validation_check,
      currency: finixData.currency || 'USD',
      country: finixData.country || 'USA',
      fingerprint: finixData.fingerprint,
      disabled_code: finixData.disabled_code,
      disabled_message: finixData.disabled_message,
      institution_number: finixData.institution_number,
      transit_number: finixData.transit_number,
      third_party: finixData.third_party,
      third_party_token: finixData.third_party_token,
      created_via: finixData.created_via || 'API',
      tags: finixData.tags || {},
      links: finixData._links || {},
      raw_finix_response: finixData,
      account_nickname: accountNickname,
      status: finixData.enabled ? 'active' : 'pending',
      finix_created_at: finixData.created_at ? new Date(finixData.created_at).toISOString() : null,
      finix_updated_at: finixData.updated_at ? new Date(finixData.updated_at).toISOString() : null
    };

    const { data: insertedPaymentMethod, error: insertError } = await supabaseClient
      .from('customer_payment_method')
      .insert(paymentMethodData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store payment method', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Payment method stored in database:', insertedPaymentMethod.id);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        paymentInstrumentId: finixData.id,
        status: finixData.enabled ? 'active' : 'pending',
        maskedAccountNumber: finixData.masked_account_number,
        accountType: finixData.account_type,
        accountNickname: accountNickname,
        databaseId: insertedPaymentMethod.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});