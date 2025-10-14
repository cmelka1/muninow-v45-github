import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTokenizedPaymentInstrumentRequest {
  customer_id: string;
  merchant_id: string;
  finix_token: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      customer_id, 
      merchant_id,
      finix_token
    }: CreateTokenizedPaymentInstrumentRequest = await req.json();
    
    console.log('🔐 Creating tokenized payment instrument for merchant:', merchant_id);
    
    if (!finix_token || !finix_token.startsWith('TK')) {
      console.error('❌ Invalid token format:', finix_token);
      throw new Error('Invalid Finix token format. Token must start with TK prefix.');
    }
    
    if (!customer_id || !merchant_id) {
      throw new Error('Missing required fields: customer_id and merchant_id');
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, finix_identity_id, user_id, finix_raw_response')
      .eq('id', merchant_id)
      .single();

    if (merchantError) {
      console.error('❌ Merchant lookup error:', merchantError);
      throw new Error(`Merchant lookup failed: ${merchantError.message}`);
    }

    if (!merchant || !merchant.finix_identity_id) {
      console.error('❌ Merchant not found or missing Finix identity');
      throw new Error('Merchant not found or missing Finix identity. Please complete Step 1 first.');
    }

    console.log('✅ Merchant found:', {
      id: merchant.id,
      finix_identity_id: merchant.finix_identity_id
    });

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('user_id')
      .eq('customer_id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('❌ Customer lookup error:', customerError);
      throw new Error('Customer not found');
    }

    if (merchant.user_id !== customer.user_id) {
      console.error('❌ Security validation failed: merchant-customer mismatch');
      throw new Error('Invalid merchant-customer relationship. Security check failed.');
    }

    console.log('✅ Security validation passed');

    const finixApiKey = Deno.env.get('FINIX_API_SECRET');
    const finixAppId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    const finixBaseUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    if (!finixApiKey || !finixAppId) {
      console.error('❌ Missing Finix API credentials');
      throw new Error('Finix payment processing is not configured properly');
    }

    console.log('🔧 Finix configuration:', {
      environment: finixEnvironment,
      baseUrl: finixBaseUrl,
      applicationId: finixAppId
    });

    const paymentInstrumentPayload = {
      type: "TOKEN",
      token: finix_token,
      identity: merchant.finix_identity_id,
      attempt_bank_account_validation_check: true,
      tags: {
        "Step": "2",
        "Customer ID": customer_id,
        "Merchant ID": merchant_id,
        "Created Via": "Tokenized Form - Merchant Onboarding",
        "Flow": "PCI Compliant"
      }
    };

    console.log('📤 Creating payment instrument via Finix API...');

    const finixResponse = await fetch(`${finixBaseUrl}/payment_instruments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(finixAppId + ':' + finixApiKey)}`,
        'Accept': 'application/hal+json',
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(paymentInstrumentPayload)
    });

    if (!finixResponse.ok) {
      const errorText = await finixResponse.text();
      console.error('❌ Finix API error:', {
        status: finixResponse.status,
        statusText: finixResponse.statusText,
        body: errorText
      });
      throw new Error(`Finix API error: ${finixResponse.status} - ${finixResponse.statusText}`);
    }

    const finixData = await finixResponse.json();
    console.log('✅ Payment instrument created:', {
      id: finixData.id,
      instrument_type: finixData.instrument_type,
      validation: finixData.bank_account_validation_check
    });

    const bankLastFour = finixData.masked_account_number?.slice(-4) || '0000';
    const maskedAccountNumber = finixData.masked_account_number || '****0000';
    const accountType = (finixData.account_type || 'CHECKING').toLowerCase();
    const accountHolderName = finixData.name || '';
    const bankCode = finixData.bank_code || '';
    const validationCheck = finixData.bank_account_validation_check || 'PENDING';

    const maskedRoutingNumber = bankCode ? `***${bankCode.slice(-4)}` : null;

    console.log('🔐 Extracted masked data:', {
      last_four: bankLastFour,
      account_type: accountType,
      validation: validationCheck,
      masked_routing: maskedRoutingNumber
    });

    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        bank_account_holder_name: accountHolderName,
        bank_routing_number: maskedRoutingNumber,
        bank_account_type: accountType,
        bank_last_four: bankLastFour,
        bank_masked_account_number: maskedAccountNumber,
        processing_status: 'payment_instrument_created',
        finix_raw_response: {
          ...merchant.finix_raw_response,
          payment_instrument: {
            id: finixData.id,
            fingerprint: finixData.fingerprint,
            created_at: finixData.created_at,
            updated_at: finixData.updated_at,
            bank_account_validation_check: validationCheck,
            instrument_type: finixData.instrument_type
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', merchant.id);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw new Error(`Database error: ${updateError.message}`);
    }

    console.log('✅ Merchant record updated successfully with masked data');

    return new Response(
      JSON.stringify({
        success: true,
        merchant_id: merchant.id,
        finix_payment_instrument_id: finixData.id,
        bank_last_four: bankLastFour,
        account_type: accountType,
        account_holder_name: accountHolderName,
        bank_account_validation_check: validationCheck,
        status: 'payment_instrument_created'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error creating tokenized payment instrument:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
