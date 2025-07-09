import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentInstrumentRequest {
  customer_id: string;
  merchant_id: string;
  bank_account_holder_name: string;
  bank_routing_number: string;
  bank_account_number: string;
  bank_account_number_confirmation: string;
  bank_account_type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      customer_id, 
      merchant_id,
      bank_account_holder_name,
      bank_routing_number,
      bank_account_number,
      bank_account_number_confirmation,
      bank_account_type
    }: CreatePaymentInstrumentRequest = await req.json();
    
    if (!customer_id || !merchant_id || !bank_account_holder_name || !bank_routing_number || !bank_account_number || !bank_account_type) {
      throw new Error('Missing required fields');
    }

    if (bank_account_number !== bank_account_number_confirmation) {
      throw new Error('Account numbers do not match');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the existing merchant record using merchant_id
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, finix_identity_id, finix_application_id, user_id, finix_raw_response')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchant) {
      console.error('Merchant lookup error:', merchantError);
      throw new Error('Merchant record not found. Please complete Step 1 first.');
    }

    // Validate that the merchant belongs to the correct customer for security
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('user_id')
      .eq('customer_id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('Customer lookup error:', customerError);
      throw new Error('Customer not found.');
    }

    if (merchant.user_id !== customer.user_id) {
      console.error('Security validation failed: merchant user_id does not match customer user_id');
      throw new Error('Invalid merchant-customer relationship.');
    }

    if (!merchant.finix_identity_id) {
      throw new Error('Finix identity not found. Please complete Step 1 first.');
    }

    // Prepare Finix API request
    const finixApiKey = Deno.env.get('FINIX_API_SECRET');
    const finixAppId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    const finixBaseUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    if (!finixApiKey || !finixAppId) {
      throw new Error('Missing Finix API credentials');
    }

    // Map bank account type to Finix format
    const mapBankAccountType = (type: string): string => {
      const mappings: Record<string, string> = {
        'business_checking': 'CHECKING',
        'business_savings': 'SAVINGS',
        'personal_checking': 'CHECKING',
        'personal_savings': 'SAVINGS'
      };
      return mappings[type] || 'CHECKING';
    };

    // Create Finix payment instrument payload
    const paymentInstrumentPayload = {
      account_type: mapBankAccountType(bank_account_type),
      bank_code: bank_routing_number,
      account_number: bank_account_number,
      type: "BANK_ACCOUNT",
      identity: merchant.finix_identity_id,
      tags: {
        "Step": "2",
        "Customer ID": customer_id,
        "Account Holder": bank_account_holder_name
      }
    };

    console.log('Creating Finix payment instrument for identity:', merchant.finix_identity_id);

    // Make API call to Finix to create payment instrument
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
      console.error('Finix API error:', finixResponse.status, errorText);
      throw new Error(`Finix API error: ${finixResponse.status} - ${errorText}`);
    }

    const finixData = await finixResponse.json();
    console.log('Finix payment instrument created:', finixData.id);
    console.log('Finix response masked_account_number:', finixData.masked_account_number);

    // Extract masked account data from Finix response for security (consistent with create-user-bank-account)
    const bankLastFour = finixData.masked_account_number 
      ? finixData.masked_account_number.slice(-4)
      : bank_account_number.slice(-4);
    const maskedAccountNumber = finixData.masked_account_number || `****${bank_account_number.slice(-4)}`;

    // Update merchant record with masked bank account details and payment instrument data
    const { data: updatedMerchant, error: updateError } = await supabase
      .from('merchants')
      .update({
        // Secure bank account details from Step 2 (no full account numbers stored)
        bank_account_holder_name: bank_account_holder_name,
        bank_routing_number: bank_routing_number,
        bank_account_type: bank_account_type,
        bank_last_four: bankLastFour,
        bank_masked_account_number: maskedAccountNumber,
        
        // Update processing status
        processing_status: 'payment_instrument_created',
        
        // Store raw Finix payment instrument response (this can be merged with existing data)
        finix_raw_response: merchant.finix_raw_response ? 
          { ...merchant.finix_raw_response, payment_instrument: finixData } : 
          { payment_instrument: finixData },
        
        updated_at: new Date().toISOString()
      })
      .eq('id', merchant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Database error: ${updateError.message}`);
    }

    console.log('Merchant record updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        merchant_id: merchant.id,
        finix_payment_instrument_id: finixData.id,
        status: 'payment_instrument_created'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error creating Finix payment instrument:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});