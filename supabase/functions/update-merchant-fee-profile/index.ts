import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateFeeProfileData {
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
    const updateData: UpdateFeeProfileData = await req.json();
    const { merchantId, ...feeData } = updateData;

    if (!merchantId) {
      return new Response(
        JSON.stringify({ error: 'Merchant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    Logger.info('Updating fee profile for merchant', { merchantId });

    // Get existing fee profile from database
    const { data: existingProfile, error: fetchError } = await supabaseClient
      .from('merchant_fee_profiles')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (fetchError || !existingProfile) {
      return new Response(
        JSON.stringify({ error: 'Fee profile not found for this merchant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingProfile.finix_fee_profile_id) {
      return new Response(
        JSON.stringify({ error: 'Finix fee profile ID not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update fee profile in Finix API
    const finixAPI = new FinixAPI();

    let finixData;
    try {
      finixData = await finixAPI.updateFeeProfile(existingProfile.finix_fee_profile_id, feeData);
      Logger.info('Finix fee profile updated', { id: finixData.id });
    } catch (error) {
       Logger.error('Finix API error', error);
       return new Response(
        JSON.stringify({ error: 'Failed to update fee profile in Finix API', details: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update fee profile in our database
    const { data: updatedProfile, error: updateError } = await supabaseClient
      .from('merchant_fee_profiles')
      .update({
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
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (updateError) {
      Logger.error('Database update error', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update fee profile in database', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    Logger.info('Fee profile updated successfully', { id: updatedProfile.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        feeProfile: updatedProfile,
        finixData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    Logger.error('Unexpected error in update-merchant-fee-profile', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});