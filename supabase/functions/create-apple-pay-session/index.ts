import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../shared/cors.ts';
import { normalizeDomain, isValidDomain } from '../shared/domainHelpers.ts';
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

Deno.serve(async (req) => {
  const requestStartTime = Date.now();
  Logger.info('APPLE PAY SESSION VALIDATION REQUEST', { 
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method
  });
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Auth token is optional - merchant validation doesn't require it
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader);
      if (user) {
        Logger.debug('[create-apple-pay-session] User authenticated', { userId: user.id });
      }
    }

    // Parse request body
    const body = await req.json();
    const { validation_url, merchant_id, domain_name, display_name } = body;
    
    Logger.info('Request Body', {
      validation_url,
      merchant_id,
      domain_name,
      display_name: display_name || 'Muni Now (default)'
    });

    // Validate required fields
    if (!validation_url || !merchant_id || !domain_name) {
      Logger.error('VALIDATION ERROR - Missing required fields', {
        has_validation_url: !!validation_url,
        has_merchant_id: !!merchant_id,
        has_domain_name: !!domain_name
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: validation_url, merchant_id, domain_name'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    Logger.info('Request validation passed');

    // Normalize domain
    const normalizedDomain = normalizeDomain(domain_name);
    Logger.info('Domain normalization', {
      original: domain_name,
      normalized: normalizedDomain
    });

    if (!isValidDomain(normalizedDomain)) {
      Logger.error('Invalid domain format', { normalizedDomain });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid domain format: ${normalizedDomain}`
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch merchant's Finix identity from database
    Logger.info('Querying merchant data from database...');
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('finix_merchant_id, finix_identity_id, merchant_name')
      .eq('id', merchant_id)
      .single();

    if (merchantError || !merchantData?.finix_identity_id) {
      Logger.error('MERCHANT LOOKUP ERROR', {
        merchant_id,
        error: merchantError,
        data: merchantData
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Merchant not found or missing Finix identity'
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const finixMerchantIdentity = merchantData.finix_identity_id;
    Logger.info('Merchant data retrieved', {
      merchant_name: merchantData.merchant_name,
      finix_merchant_id: merchantData.finix_merchant_id,
      finix_identity_id: finixMerchantIdentity,
      domain: normalizedDomain
    });

    // Validate identity format
    if (!finixMerchantIdentity.startsWith('ID')) {
      Logger.error('Invalid finix_identity_id format', { finixMerchantIdentity });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Merchant has invalid Finix Identity ID. Must start with "ID".'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    Logger.info('Identity validation passed');

    // Initialize Finix API
    const finixAPI = new FinixAPI();

    // Call Finix API to create Apple Pay session
    const finixCallStart = Date.now();
    const sessionResult = await finixAPI.createApplePaySession({
      displayName: display_name || 'Muni Now',
      domain: normalizedDomain,
      merchantIdentity: finixMerchantIdentity,
      validationUrl: validation_url
    });
    const finixCallDuration = Date.now() - finixCallStart;

    Logger.info('Finix API Result', {
      success: sessionResult.success,
      duration_ms: finixCallDuration
    });

    if (!sessionResult.success) {
      const finixData = sessionResult.raw_response || {};
      // Check if error is domain-related
      const isDomainError = finixData.message?.toLowerCase().includes('domain') || 
                             finixData.message?.toLowerCase().includes('merchant');

      const errorMessage = isDomainError
        ? `Domain "${normalizedDomain}" is not registered in Finix. Please verify the domain is added and verified in your Finix Dashboard under Apple Pay settings.`
        : sessionResult.error || 'Failed to create Apple Pay session';

      Logger.error('FINIX API ERROR', {
        error_message: errorMessage,
        domain_used: normalizedDomain
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          domain: normalizedDomain,
          hint: isDomainError ? 'Verify this domain is registered and verified in Finix Dashboard' : undefined,
          details: finixData
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const totalDuration = Date.now() - requestStartTime;
    Logger.info('SESSION CREATED SUCCESSFULLY', {
      total_duration_ms: totalDuration,
      merchant: merchantData.merchant_name,
      domain: normalizedDomain
    });

    return new Response(
      JSON.stringify({
        success: true,
        session_details: sessionResult.session_details
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    Logger.error('CRITICAL ERROR IN APPLE PAY SESSION', {
      duration_ms: totalDuration,
      error_type: error?.constructor?.name,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Apple Pay session'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
