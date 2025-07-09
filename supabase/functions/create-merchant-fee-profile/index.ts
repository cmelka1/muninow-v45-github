import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeeProfileData {
  merchantId: string;
  ach_basis_points?: number;
  ach_basis_points_fee_limit?: number;
  ach_fixed_fee?: number;
  basis_points?: number;
  fixed_fee?: number;
  ach_credit_return_fixed_fee?: number;
  ach_debit_return_fixed_fee?: number;
  dispute_fixed_fee?: number;
  dispute_inquiry_fixed_fee?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authorization header to extract user info
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is SuperAdmin
    const { data: userRoles, error: rolesError } = await supabaseClient.rpc('get_user_roles', {
      _user_id: user.id
    });

    if (rolesError) {
      console.error('Error checking user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = userRoles?.some((roleData: any) => roleData.role === 'superAdmin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. SuperAdmin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const feeProfileData: FeeProfileData = await req.json();
    const { merchantId, ...feeData } = feeProfileData;

    if (!merchantId) {
      return new Response(
        JSON.stringify({ error: 'Merchant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating fee profile for merchant:', merchantId);

    // Create fee profile in Finix API
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixApiUrl = Deno.env.get('FINIX_API_URL') || 'https://finix.sandbox-payments-api.com';

    if (!finixApplicationId || !finixApiSecret) {
      return new Response(
        JSON.stringify({ error: 'Finix API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finixResponse = await fetch(`${finixApiUrl}/fee_profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`
      },
      body: JSON.stringify(feeData)
    });

    if (!finixResponse.ok) {
      const finixError = await finixResponse.text();
      console.error('Finix API error:', finixError);
      return new Response(
        JSON.stringify({ error: 'Failed to create fee profile in Finix API', details: finixError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finixData = await finixResponse.json();
    console.log('Finix fee profile created:', finixData.id);

    // Store fee profile in our database
    const { data: feeProfile, error: dbError } = await supabaseClient
      .from('merchant_fee_profiles')
      .insert({
        merchant_id: merchantId,
        finix_fee_profile_id: finixData.id,
        finix_application_id: finixData.application,
        finix_raw_response: finixData,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        
        // Map response fields to database columns
        ach_basis_points: finixData.ach_basis_points,
        ach_basis_points_fee_limit: finixData.ach_basis_points_fee_limit,
        ach_fixed_fee: finixData.ach_fixed_fee,
        basis_points: finixData.basis_points,
        fixed_fee: finixData.fixed_fee,
        ach_credit_return_fixed_fee: finixData.ach_credit_return_fixed_fee,
        ach_debit_return_fixed_fee: finixData.ach_debit_return_fixed_fee,
        dispute_fixed_fee: finixData.dispute_fixed_fee,
        dispute_inquiry_fixed_fee: finixData.dispute_inquiry_fixed_fee,
        
        // Additional fields from Finix response
        american_express_assessment_basis_points: finixData.american_express_assessment_basis_points,
        american_express_basis_points: finixData.american_express_basis_points,
        american_express_charge_interchange: finixData.american_express_charge_interchange,
        american_express_externally_funded_basis_points: finixData.american_express_externally_funded_basis_points,
        american_express_externally_funded_fixed_fee: finixData.american_express_externally_funded_fixed_fee,
        american_express_fixed_fee: finixData.american_express_fixed_fee,
        
        charge_interchange: finixData.charge_interchange,
        qualified_tiers: finixData.qualified_tiers,
        rounding_mode: finixData.rounding_mode,
        tags: finixData.tags || {}
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to store fee profile in database', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fee profile created successfully:', feeProfile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        feeProfile,
        finixData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});