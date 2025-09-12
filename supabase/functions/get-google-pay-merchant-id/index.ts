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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body to get merchant_id if provided
    let merchantId = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        merchantId = body?.merchant_id;
      } catch (e) {
        // Body parsing failed, continue with fallback
        console.log('Failed to parse request body, using fallback');
      }
    }

    let googlePayMerchantId = null;

    // If merchant_id is provided, try to get the finix_merchant_id from database
    if (merchantId) {
      console.log('Looking up finix_merchant_id for merchant:', merchantId);
      
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('finix_merchant_id')
        .eq('id', merchantId)
        .single();

      if (!merchantError && merchant?.finix_merchant_id) {
        googlePayMerchantId = merchant.finix_merchant_id;
        console.log('Found finix_merchant_id from database:', googlePayMerchantId);
      } else {
        console.log('Merchant not found or no finix_merchant_id, falling back to env variable');
      }
    }

    // Fallback to environment variable if no merchant-specific ID found
    if (!googlePayMerchantId) {
      googlePayMerchantId = Deno.env.get('GOOGLE_PAY_MERCHANT_ID');
      console.log('Using fallback Google Pay merchant ID from environment');
    }
    
    if (!googlePayMerchantId) {
      console.error('Google Pay merchant ID not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Google Pay merchant ID not configured',
          merchant_id: null 
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Retrieved Google Pay merchant ID:', googlePayMerchantId);

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
    console.error('Error in get-google-pay-merchant-id function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        merchant_id: null 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});