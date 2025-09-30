import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateServiceApplicationRequest {
  tile_id: string;
  customer_id: string;
  merchant_id: string;
  user_id: string;
  form_data: any;
  base_amount_cents: number;
  merchant_name?: string;
  category?: string;
  subcategory?: string;
  statement_descriptor?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting service application creation with payment...');

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

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const body: CreateServiceApplicationRequest = await req.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.tile_id || !body.customer_id || !body.merchant_id || !body.user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create service application record
    console.log('📝 Creating service application record...');
    
    const { data: application, error: insertError } = await supabaseClient
      .from('municipal_service_applications')
      .insert({
        tile_id: body.tile_id,
        customer_id: body.customer_id,
        merchant_id: body.merchant_id,
        user_id: body.user_id,
        form_data: body.form_data || {},
        base_amount_cents: body.base_amount_cents,
        total_amount_cents: body.base_amount_cents,
        service_fee_cents: 0, // Will be updated during payment
        merchant_name: body.merchant_name,
        category: body.category,
        subcategory: body.subcategory,
        statement_descriptor: body.statement_descriptor,
        status: 'draft', // Will be updated after payment
        payment_status: 'pending',
        submission_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create service application:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message || 'Failed to create service application',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Service application created:', application.id);

    // Return success with application ID
    return new Response(
      JSON.stringify({
        success: true,
        service_application_id: application.id,
        application_number: application.application_number,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
