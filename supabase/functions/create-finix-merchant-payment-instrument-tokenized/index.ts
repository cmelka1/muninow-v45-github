import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

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
    
    Logger.info('Creating tokenized payment instrument for merchant', { merchant_id });
    
    if (!finix_token || !finix_token.startsWith('TK')) {
      Logger.error('Invalid token format', { finix_token });
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
      Logger.error('Merchant lookup error', merchantError);
      throw new Error(`Merchant lookup failed: ${merchantError.message}`);
    }

    if (!merchant || !merchant.finix_identity_id) {
      Logger.error('Merchant not found or missing Finix identity');
      throw new Error('Merchant not found or missing Finix identity. Please complete Step 1 first.');
    }

    Logger.info('Merchant found', {
      id: merchant.id,
      finix_identity_id: merchant.finix_identity_id
    });

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('user_id')
      .eq('customer_id', customer_id)
      .single();

    if (customerError || !customer) {
      Logger.error('Customer lookup error', customerError);
      throw new Error('Customer not found');
    }

    if (merchant.user_id !== customer.user_id) {
      Logger.error('Security validation failed: merchant-customer mismatch');
      throw new Error('Invalid merchant-customer relationship. Security check failed.');
    }

    Logger.info('Security validation passed');

    const finixAPI = new FinixAPI();

    Logger.info('Creating payment instrument via Finix API');

    const finixData = await finixAPI.createPaymentInstrument({
      type: 'TOKEN',
      token: finix_token,
      identity: merchant.finix_identity_id,
      bankAccountValidationCheck: true,
      tags: {
        "Step": "2",
        "Customer ID": customer_id,
        "Merchant ID": merchant_id,
        "Created Via": "Tokenized Form - Merchant Onboarding",
        "Flow": "PCI Compliant"
      }
    });

    if (!finixData.success) {
      Logger.error('Finix API error', finixData.error);
      throw new Error(`Finix API error: ${finixData.error}`);
    }

    Logger.info('Payment instrument created', {
      id: finixData.data?.id,
      instrument_type: finixData.data?.instrument_type,
      validation: finixData.data?.bank_account_validation_check
    });

    const instrumentData = finixData.data!;
    const bankLastFour = instrumentData.masked_account_number?.slice(-4) || '0000';
    const maskedAccountNumber = instrumentData.masked_account_number || '****0000';
    const accountType = (instrumentData.account_type || 'CHECKING').toLowerCase();
    const accountHolderName = instrumentData.name || '';
    const bankCode = instrumentData.bank_code || '';
    const validationCheck = instrumentData.bank_account_validation_check || 'PENDING';

    const maskedRoutingNumber = bankCode ? `***${bankCode.slice(-4)}` : null;

    Logger.info('Extracted masked data', {
      last_four: bankLastFour,
      account_type: accountType,
      validation: validationCheck
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
            id: instrumentData.id,
            fingerprint: instrumentData.fingerprint,
            created_at: instrumentData.created_at,
            updated_at: instrumentData.updated_at,
            bank_account_validation_check: validationCheck,
            instrument_type: instrumentData.instrument_type
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', merchant.id);

    if (updateError) {
      Logger.error('Database update error', updateError);
      throw new Error(`Database error: ${updateError.message}`);
    }

    Logger.info('Merchant record updated successfully with masked data');

    return new Response(
      JSON.stringify({
        success: true,
        merchant_id: merchant.id,
        finix_payment_instrument_id: instrumentData.id,
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
    Logger.error('Error creating tokenized payment instrument', error);
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
