import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const isSuperAdmin = userRoles?.some((roleData: any) => roleData.role === 'superadmin');
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

    console.log('Confirming fee profile:', feeProfileId);

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
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixApiUrl = Deno.env.get('FINIX_API_URL') || 'https://finix.sandbox-payments-api.com';

    if (!finixApplicationId || !finixApiSecret) {
      return new Response(
        JSON.stringify({ error: 'Finix API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updateData = {
      fee_profile: feeProfile.finix_fee_profile_id,
      card_present_fee_profile: feeProfile.finix_fee_profile_id
    };

    const finixResponse = await fetch(`${finixApiUrl}/merchant_profiles/${feeProfile.finix_merchant_profile_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`
      },
      body: JSON.stringify(updateData)
    });

    if (!finixResponse.ok) {
      const finixError = await finixResponse.text();
      console.error('Finix API error:', finixError);
      
      // Try to cleanup/rollback the fee profile creation
      try {
        await fetch(`${finixApiUrl}/fee_profiles/${feeProfile.finix_fee_profile_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`
          }
        });
        
        // Also delete from our database
        await supabaseClient
          .from('merchant_fee_profiles')
          .delete()
          .eq('id', feeProfileId);
        
        console.log('Rollback completed due to merchant profile update failure');
      } catch (rollbackError) {
        console.error('Failed to rollback fee profile:', rollbackError);
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to update merchant profile in Finix API', details: finixError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const merchantProfileData = await finixResponse.json();
    console.log('Merchant profile updated with fee profile:', merchantProfileData.id);

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
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update fee profile in database', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fee profile confirmed successfully:', updatedFeeProfile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        feeProfile: updatedFeeProfile,
        merchantProfileData
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