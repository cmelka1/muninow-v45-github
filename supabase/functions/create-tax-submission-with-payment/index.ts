import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTaxSubmissionRequest {
  user_id: string;
  customer_id: string;
  merchant_id: string;
  tax_type: string;
  tax_period_start?: string;
  tax_period_end?: string;
  tax_year?: number;
  base_amount_cents: number;
  calculation_notes?: string;
  total_amount_due_cents: number;
  service_fee_cents: number;
  total_amount_cents: number;
  payer_first_name?: string;
  payer_last_name?: string;
  payer_email?: string;
  payer_ein?: string;
  payer_phone?: string;
  payer_business_name?: string;
  payer_street_address?: string;
  payer_city?: string;
  payer_state?: string;
  payer_zip_code?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get and validate auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Authenticated user:', user.id);

    const requestBody: CreateTaxSubmissionRequest = await req.json();
    console.log('Request body:', {
      ...requestBody,
      // Mask sensitive data in logs
      payer_ein: requestBody.payer_ein ? '***' : undefined
    });

    // Validate required fields
    if (!requestBody.user_id || !requestBody.customer_id || !requestBody.merchant_id || 
        !requestBody.tax_type || !requestBody.base_amount_cents) {
      throw new Error('Missing required fields');
    }

    // Create tax submission record
    const { data: taxSubmission, error: taxError } = await supabaseClient
      .from('tax_submissions')
      .insert({
        user_id: requestBody.user_id,
        customer_id: requestBody.customer_id,
        merchant_id: requestBody.merchant_id,
        tax_type: requestBody.tax_type,
        tax_period_start: requestBody.tax_period_start,
        tax_period_end: requestBody.tax_period_end,
        tax_year: requestBody.tax_year,
        base_amount_cents: requestBody.base_amount_cents,
        calculation_notes: requestBody.calculation_notes,
        total_amount_due_cents: requestBody.total_amount_due_cents,
        service_fee_cents: requestBody.service_fee_cents,
        total_amount_cents: requestBody.total_amount_cents,
        submission_status: 'draft',
        payment_status: 'pending',
        transfer_state: 'PENDING',
        submission_date: new Date().toISOString(),
        first_name: requestBody.payer_first_name,
        last_name: requestBody.payer_last_name,
        email: requestBody.payer_email,
        payer_ein: requestBody.payer_ein,
        payer_phone: requestBody.payer_phone,
        payer_business_name: requestBody.payer_business_name,
        payer_street_address: requestBody.payer_street_address,
        payer_city: requestBody.payer_city,
        payer_state: requestBody.payer_state,
        payer_zip_code: requestBody.payer_zip_code
      })
      .select()
      .single();

    if (taxError) {
      console.error('Tax submission creation error:', taxError);
      throw new Error(`Failed to create tax submission: ${taxError.message}`);
    }

    console.log('Tax submission created successfully:', taxSubmission.id);

    return new Response(
      JSON.stringify({
        success: true,
        tax_submission_id: taxSubmission.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in create-tax-submission-with-payment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});