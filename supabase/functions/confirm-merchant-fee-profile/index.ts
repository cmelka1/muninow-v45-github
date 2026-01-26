import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmFeeProfileData {
  feeProfileId: string;
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

    // Check if user is SuperAdmin via profiles.account_type
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single();

    if (profileError) {
      Logger.error('Error checking user profile', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = profile?.account_type === 'superadmin';
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. SuperAdmin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { feeProfileId }: ConfirmFeeProfileData = await req.json();

    if (!feeProfileId) {
      return new Response(
        JSON.stringify({ error: 'Fee Profile ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    Logger.info('Confirming fee profile', { feeProfileId });

    // Get fee profile from database
    const { data: feeProfile, error: fetchError } = await supabaseClient
      .from('merchant_fee_profiles')
      .select('*')
      .eq('id', feeProfileId)
      .single();

    if (fetchError || !feeProfile) {
      return new Response(
        JSON.stringify({ error: 'Fee profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!feeProfile.finix_fee_profile_id || !feeProfile.finix_merchant_profile_id) {
      return new Response(
        JSON.stringify({ error: 'Required Finix IDs not found in fee profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update merchant profile in Finix API
    const finixAPI = new FinixAPI();

    const updateData = {
      fee_profile: feeProfile.finix_fee_profile_id,
      card_present_fee_profile: feeProfile.finix_fee_profile_id
    };

    let merchantProfileData;
    try {
        merchantProfileData = await finixAPI.updateMerchantProfile(feeProfile.finix_merchant_profile_id, updateData);
    } catch (finixError) {
        Logger.error('Finix API error', finixError);
      
        // Try to cleanup/rollback the fee profile creation
        try {
            await finixAPI.deleteFeeProfile(feeProfile.finix_fee_profile_id);
            
            // Also delete from our database
            await supabaseClient
            .from('merchant_fee_profiles')
            .delete()
            .eq('id', feeProfileId);
            
            Logger.info('Rollback completed due to merchant profile update failure');
        } catch (rollbackError) {
            Logger.error('Failed to rollback fee profile', rollbackError);
        }
        
        return new Response(
            JSON.stringify({ error: 'Failed to update merchant profile in Finix API', details: finixError instanceof Error ? finixError.message : String(finixError) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    Logger.info('Merchant profile updated with fee profile', { merchantProfileId: merchantProfileData.id });

    // Clean up old fee profiles for this merchant (keep only the current one)
    await supabaseClient
      .from('merchant_fee_profiles')
      .delete()
      .eq('merchant_id', feeProfile.merchant_id)
      .neq('id', feeProfileId);

    // Update our database record with the merchant profile response
    const { data: updatedFeeProfile, error: updateError } = await supabaseClient
      .from('merchant_fee_profiles')
      .update({
        merchant_profile_raw_response: merchantProfileData,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', feeProfileId)
      .select()
      .single();

    if (updateError) {
      Logger.error('Database update error', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update fee profile in database', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    Logger.info('Fee profile confirmed successfully', { id: updatedFeeProfile.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        feeProfile: updatedFeeProfile,
        merchantProfileData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    Logger.error('Unexpected error in confirm-merchant-fee-profile', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});