import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { Logger } from '../shared/logger.ts';

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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      Logger.error('Missing authorization header');
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    Logger.debug('Verifying JWT token...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      Logger.error('JWT verification error', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    // Verify user is authenticated
    if (!user) {
      Logger.error('No user found after JWT verification');
      throw new Error('Unauthorized');
    }
    
    Logger.info('User authenticated', { userId: user.id });

    // Parse request body for merchant_id
    let merchantId = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        merchantId = body?.merchant_id;
      } catch {
        // Body parsing failed, harmless callback
      }
    }

    let googlePayMerchantId = null;

    // 1. Try Specific Merchant Lookup (for sub-merchants)
    if (merchantId) {
      Logger.info('Lookup for merchant', { merchantId });
      
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('finix_identity_id')
        .eq('id', merchantId)
        .single();

      if (!merchantError && merchant?.finix_identity_id) {
        googlePayMerchantId = merchant.finix_identity_id;
        Logger.info('Found Identity ID', { googlePayMerchantId });
      } else {
        Logger.warn('Merchant lookup failed or missing Identity ID');
      }
    } 
    
    // 2. Fallback to Environment Variable (Platform Account)
    // This is useful for general platform payments or testing
    if (!googlePayMerchantId) {
      googlePayMerchantId = Deno.env.get('GOOGLE_PAY_MERCHANT_ID');
      if (googlePayMerchantId) {
         Logger.info('Using Env Var fallback');
      }
    }
    
    if (!googlePayMerchantId) {
      Logger.error('No Google Pay Merchant ID configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Google Pay configuration missing',
          merchant_id: null 
        }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        merchant_id: googlePayMerchantId 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    Logger.error('Error in get-google-pay-merchant-id function', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        merchant_id: null 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});