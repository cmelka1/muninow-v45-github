import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../shared/cors.ts';
import { Logger } from '../shared/logger.ts';

/**
 * Google Pay Merchant ID Edge Function
 * 
 * Returns the configuration needed for Google Pay integration:
 * - finix_identity_id: Used for gatewayMerchantId (Finix tokenization)
 * - google_merchant_id: Used for merchantInfo.merchantId (Google verification)
 * - finix_merchant_id: Used for creating transfers
 * 
 * Required Secrets:
 * - GOOGLE_PAY_MERCHANT_ID_GOOGLE: Google's BCR2DN... merchant ID
 */

Deno.serve(async (req) => {
  Logger.info('=== GET GOOGLE PAY MERCHANT ID ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      Logger.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      Logger.error('Authentication failed', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    Logger.info('User authenticated', { userId: user.id });

    // Parse request body for merchant_id (Supabase UUID)
    let merchantId: string | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        merchantId = body?.merchant_id;
        Logger.info('Request body parsed', { merchantId });
      } catch {
        Logger.warn('Failed to parse request body');
      }
    }

    // Fetch merchant configuration from database
    let finixIdentityId: string | null = null;
    let finixMerchantId: string | null = null;

    if (merchantId) {
      Logger.info('Looking up merchant', { merchantId });
      
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('finix_identity_id, finix_merchant_id')
        .eq('id', merchantId)
        .single();

      if (merchantError) {
        Logger.error('Merchant lookup failed', merchantError);
      } else if (merchant) {
        finixIdentityId = merchant.finix_identity_id;
        finixMerchantId = merchant.finix_merchant_id;
        Logger.info('Found merchant', { finixIdentityId, finixMerchantId });
      }
    }

    // Fallback to environment variable if no merchant found
    if (!finixIdentityId) {
      finixIdentityId = Deno.env.get('GOOGLE_PAY_MERCHANT_ID');
      if (finixIdentityId) {
        Logger.info('Using GOOGLE_PAY_MERCHANT_ID env var fallback');
      }
    }

    // Validate we have a Finix identity
    if (!finixIdentityId) {
      Logger.error('No Finix identity configured for merchant');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Google Pay not configured for this merchant'
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google's merchant ID from secrets (BCR2DN... format)
    // This is REQUIRED for Google Pay to work in production
    const googleMerchantId = Deno.env.get('GOOGLE_PAY_MERCHANT_ID_GOOGLE');
    
    if (!googleMerchantId) {
      Logger.error('CRITICAL: GOOGLE_PAY_MERCHANT_ID_GOOGLE secret is NOT SET!');
      Logger.error('Google Pay will fail without this secret.');
    } else {
      Logger.info('Google merchant ID loaded from secret', { 
        googleMerchantId: googleMerchantId.substring(0, 8) + '...' 
      });
    }

    // Return explicit, clear configuration
    const response = {
      success: true,
      // For Google Pay paymentRequest.tokenizationSpecification.parameters.gatewayMerchantId
      finix_identity_id: finixIdentityId,
      // For Google Pay paymentRequest.merchantInfo.merchantId (Google's BCR2DN... ID)
      google_merchant_id: googleMerchantId || null,
      // For Finix transfers (optional, may be null for some merchants)
      finix_merchant_id: finixMerchantId || null
    };

    Logger.info('Returning Google Pay configuration', {
      finix_identity_id: finixIdentityId,
      google_merchant_id: googleMerchantId ? 'SET' : 'NOT SET',
      finix_merchant_id: finixMerchantId ? 'SET' : 'NOT SET'
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    Logger.error('Error in get-google-pay-merchant-id', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});