import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { corsHeaders } from '../shared/cors.ts';

Deno.serve(async (req) => {
  console.log('=== CREATE TAX SUBMISSION REQUEST ===');
  
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

    // Get user from auth token
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('[create-tax-submission] Authenticated user:', user.id);

    // Parse request body
    const body = await req.json();
    
    const {
      user_id,
      customer_id,
      merchant_id,
      tax_type,
      tax_period_start,
      tax_period_end,
      tax_year,
      base_amount_cents,
      calculation_notes,
      payer_first_name,
      payer_last_name,
      payer_email,
      payer_ein,
      payer_phone,
      payer_business_name,
      payer_street_address,
      payer_city,
      payer_state,
      payer_zip_code
    } = body;

    // Validate required fields
    if (!user_id || !customer_id || !merchant_id || !tax_type || !base_amount_cents) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[create-tax-submission] Creating tax submission:', {
      user_id,
      customer_id,
      tax_type,
      base_amount_cents
    });

    // Create tax submission in draft status (amounts will be populated after payment calculation)
    const { data: taxSubmission, error: insertError } = await supabase
      .from('tax_submissions')
      .insert({
        user_id,
        customer_id,
        merchant_id,
        tax_type,
        tax_period_start,
        tax_period_end,
        tax_year,
        base_amount_cents,
        service_fee_cents: null, // Will be populated after payment calculation
        total_amount_due_cents: null, // Will be populated after payment calculation
        submission_status: 'draft',
        payment_status: 'unpaid',
        first_name: payer_first_name,
        last_name: payer_last_name,
        email: payer_email,
        payer_ein,
        payer_phone,
        payer_business_name,
        payer_street_address,
        payer_city,
        payer_state,
        payer_zip_code,
        calculation_notes,
        submission_date: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-tax-submission] Insert error:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: insertError.message 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('[create-tax-submission] Tax submission created:', taxSubmission.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tax_submission_id: taxSubmission.id,
        data: taxSubmission
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('[create-tax-submission] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tax submission'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
