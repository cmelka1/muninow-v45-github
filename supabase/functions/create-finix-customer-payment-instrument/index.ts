import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is super admin (cmelka@muninow.com)
    if (user.email !== 'cmelka@muninow.com') {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { customerId, bankAccount } = await req.json();

    // Validate required fields
    if (!customerId || !bankAccount?.nameOnAccount || !bankAccount?.routingNumber || !bankAccount?.accountNumber) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: 'customerId, nameOnAccount, routingNumber, and accountNumber are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate routing number format (9 digits)
    if (!/^\d{9}$/.test(bankAccount.routingNumber)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid routing number format',
        details: 'Routing number must be exactly 9 digits'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get customer data from database
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return new Response(JSON.stringify({ 
        error: 'Customer not found',
        details: customerError?.message
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customer.finix_identity_id) {
      return new Response(JSON.stringify({ 
        error: 'Customer missing Finix identity',
        details: 'Customer must have a valid Finix identity before adding payment instruments'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Finix credentials
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');

    if (!finixApiSecret || !finixApplicationId) {
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Missing Finix API credentials'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare Finix API request
    const finixBaseUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com' 
      : 'https://finix.sandbox-payments-api.com';

    const finixPayload = {
      account_number: bankAccount.accountNumber,
      account_type: "BUSINESS_CHECKING",
      bank_code: bankAccount.routingNumber,
      identity: customer.finix_identity_id,
      name: bankAccount.nameOnAccount,
      type: "BANK_ACCOUNT"
    };

    // Make request to Finix API
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
      return new Response(JSON.stringify({ 
        error: 'Failed to create payment instrument',
        details: finixData.message || 'Finix API request failed',
        finixError: finixData
      }), {
        status: finixResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for database insertion
    const paymentMethodData = {
      customer_id: customerId,
      finix_payment_instrument_id: finixData.id,
      finix_application_id: finixData.application,
      finix_identity_id: finixData.identity,
      enabled: finixData.enabled,
      instrument_type: finixData.instrument_type,
      account_type: finixData.account_type,
      bank_code: finixData.bank_code,
      masked_account_number: finixData.masked_account_number,
      account_holder_name: finixData.name,
      bank_account_validation_check: finixData.bank_account_validation_check,
      currency: finixData.currency,
      country: finixData.country,
      fingerprint: finixData.fingerprint,
      disabled_code: finixData.disabled_code,
      disabled_message: finixData.disabled_message,
      created_via: finixData.created_via,
      tags: finixData.tags || {},
      links: finixData._links || {},
      raw_finix_response: finixData,
      account_nickname: bankAccount.accountNickname || null,
      status: 'pending',
      finix_created_at: finixData.created_at,
      finix_updated_at: finixData.updated_at,
      third_party: finixData.third_party,
      third_party_token: finixData.third_party_token,
      transit_number: finixData.transit_number,
      institution_number: finixData.institution_number
    };

    // Insert into customer_payment_method table
    const { data: insertedPaymentMethod, error: insertError } = await supabase
      .from('customer_payment_method')
      .insert(paymentMethodData)
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ 
        error: 'Failed to save payment method',
        details: insertError.message,
        finixId: finixData.id
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Payment instrument created successfully',
      paymentMethod: {
        id: insertedPaymentMethod.id,
        finixId: finixData.id,
        accountNickname: bankAccount.accountNickname,
        maskedAccountNumber: finixData.masked_account_number,
        accountHolderName: finixData.name,
        status: 'pending'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});