import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateMerchantRequest {
  customer_id: string;
  merchant_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, merchant_id }: CreateMerchantRequest = await req.json();
    
    if (!customer_id || !merchant_id) {
      throw new Error('Missing required fields: customer_id and merchant_id');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the existing merchant record
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, finix_identity_id, finix_application_id, user_id, processing_status')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchant) {
      console.error('Merchant lookup error:', merchantError);
      throw new Error('Merchant record not found. Please complete previous steps first.');
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
      throw new Error('Finix identity not found. Please complete Steps 1 and 2 first.');
    }

    if (merchant.processing_status !== 'payment_instrument_created') {
      throw new Error('Payment instrument must be created before creating merchant account. Please complete Step 2 first.');
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

    // Create Finix merchant payload
    const merchantPayload = {
      processor: "DUMMY_V1",
      level_two_level_three_data_enabled: true
    };

    console.log('Creating Finix merchant for identity:', merchant.finix_identity_id);

    // Make API call to Finix to create merchant
    const finixResponse = await fetch(`${finixBaseUrl}/identities/${merchant.finix_identity_id}/merchants`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(finixAppId + ':' + finixApiKey)}`,
        'Accept': 'application/hal+json',
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(merchantPayload)
    });

    if (!finixResponse.ok) {
      const errorText = await finixResponse.text();
      console.error('Finix API error:', finixResponse.status, errorText);
      throw new Error(`Finix API error: ${finixResponse.status} - ${errorText}`);
    }

    const finixData = await finixResponse.json();
    console.log('Finix merchant created:', finixData.id);

    // Map Finix response to database columns
    const merchantUpdate = {
      // Finix merchant information
      finix_merchant_id: finixData.id,
      finix_merchant_profile_id: finixData.merchant_profile || null,
      finix_verification_id: finixData.verification || null,
      finix_application_id: finixData.application || merchant.finix_application_id,
      
      // Merchant status and capabilities
      onboarding_state: finixData.onboarding_state || null,
      processing_enabled: finixData.processing_enabled || false,
      settlement_enabled: finixData.settlement_enabled || false,
      level_two_level_three_data_enabled: finixData.level_two_level_three_data_enabled || false,
      processor_type: finixData.processor || null,
      
      // Update processing status
      processing_status: 'merchant_created',
      
      // Store complete Finix response for audit purposes
      finix_raw_response: merchant.finix_raw_response ? 
        { ...merchant.finix_raw_response, merchant: finixData } : 
        { merchant: finixData },
      
      updated_at: new Date().toISOString()
    };

    // Update merchant record with Finix merchant data
    const { data: updatedMerchant, error: updateError } = await supabase
      .from('merchants')
      .update(merchantUpdate)
      .eq('id', merchant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Database error: ${updateError.message}`);
    }

    console.log('Merchant record updated successfully with Finix merchant data');

    return new Response(
      JSON.stringify({
        success: true,
        merchant_id: merchant.id,
        finix_merchant_id: finixData.id,
        status: 'merchant_created',
        onboarding_state: finixData.onboarding_state
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error creating Finix merchant:', error);
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