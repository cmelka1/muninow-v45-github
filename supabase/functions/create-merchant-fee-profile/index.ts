import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeeProfileData {
  merchantId: string;
  ach_basis_points: number;
  ach_basis_points_fee_limit?: number;
  ach_fixed_fee: number;
  basis_points: number;
  fixed_fee: number;
  ach_credit_return_fixed_fee: number;
  ach_debit_return_fixed_fee: number;
  dispute_fixed_fee: number;
  dispute_inquiry_fixed_fee: number;
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
      Logger.error('Error checking user roles', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = userRoles?.some((roleData: any) => roleData.role === 'superadmin');
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

    Logger.info('Creating fee profile for merchant', { merchantId });

    // Get merchant info for database record
    const { data: merchant, error: merchantError } = await supabaseClient
      .from('merchants')
      .select('merchant_name, finix_merchant_id, finix_merchant_profile_id')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ error: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create fee profile in Finix API
    const finixAPI = new FinixAPI();

    let finixData;
    try {
      finixData = await finixAPI.createFeeProfile(feeData);
      Logger.info('Finix fee profile created', { id: finixData.id });
    } catch (error) {
       Logger.error('Finix API error', error);
       return new Response(
        JSON.stringify({ error: 'Failed to create fee profile in Finix API', details: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store fee profile in our database
    const { data: feeProfile, error: dbError } = await supabaseClient
      .from('merchant_fee_profiles')
      .insert({
        merchant_id: merchantId,
        merchant_name: merchant.merchant_name,
        finix_merchant_id: merchant.finix_merchant_id,
        finix_merchant_profile_id: merchant.finix_merchant_profile_id,
        finix_fee_profile_id: finixData.id,
        finix_application_id: finixData.application,
        finix_raw_response: finixData,
        sync_status: 'created',
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
      Logger.error('Database error when storing fee profile', dbError);
      
      return new Response(
        JSON.stringify({ error: 'Failed to store fee profile in database', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    Logger.info('Fee profile stored in database successfully', { id: feeProfile.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        feeProfile,
        finixData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    Logger.error('Unexpected error in create-merchant-fee-profile', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});