import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is superAdmin using RPC function
    const { data: userRoles, error: rolesError } = await supabaseClient
      .rpc('get_user_roles', { _user_id: user.id });

    if (rolesError || !userRoles?.some((role: any) => role.role === 'superAdmin')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only super administrators can create fee profiles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { merchantId, profileData } = await req.json();

    if (!merchantId || !profileData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: merchantId and profileData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify merchant exists
    const { data: merchant, error: merchantError } = await supabaseClient
      .from('merchants')
      .select('id, finix_application_id')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      return new Response(
        JSON.stringify({ error: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if fee profile already exists
    const { data: existingProfile } = await supabaseClient
      .from('merchant_fee_profiles')
      .select('id')
      .eq('merchant_id', merchantId)
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'Fee profile already exists for this merchant' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create fee profile in Finix
    console.log('Creating fee profile in Finix for merchant:', merchantId);
    
    const finixResponse = await fetch('https://finix.sandbox-payments-api.com/v2/fee_profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Basic ${btoa(`${Deno.env.get('FINIX_USERNAME')}:${Deno.env.get('FINIX_PASSWORD')}`)}`,
      },
      body: JSON.stringify({
        ach_basis_points: profileData.ach_basis_points,
        ach_basis_points_fee_limit: profileData.ach_basis_points_fee_limit,
        ach_fixed_fee: profileData.ach_fixed_fee,
        basis_points: profileData.basis_points,
        ach_credit_return_fixed_fee: profileData.ach_credit_return_fixed_fee,
        ach_debit_return_fixed_fee: profileData.ach_debit_return_fixed_fee,
        fixed_fee: profileData.fixed_fee,
        dispute_fixed_fee: profileData.dispute_fixed_fee,
        dispute_inquiry_fixed_fee: profileData.dispute_inquiry_fixed_fee,
      }),
    });

    if (!finixResponse.ok) {
      const finixError = await finixResponse.text();
      console.error('Finix API error:', finixError);
      
      // Create local fee profile with error status
      const { data: localProfile, error: localError } = await supabaseClient
        .from('merchant_fee_profiles')
        .insert({
          merchant_id: merchantId,
          finix_application_id: merchant.finix_application_id,
          basis_points: profileData.basis_points,
          fixed_fee: profileData.fixed_fee,
          ach_basis_points: profileData.ach_basis_points,
          ach_fixed_fee: profileData.ach_fixed_fee,
          ach_basis_points_fee_limit: profileData.ach_basis_points_fee_limit,
          ach_credit_return_fixed_fee: profileData.ach_credit_return_fixed_fee,
          ach_debit_return_fixed_fee: profileData.ach_debit_return_fixed_fee,
          dispute_fixed_fee: profileData.dispute_fixed_fee,
          dispute_inquiry_fixed_fee: profileData.dispute_inquiry_fixed_fee,
          sync_status: 'error',
        })
        .select()
        .single();

      if (localError) {
        console.error('Error creating local fee profile:', localError);
        return new Response(
          JSON.stringify({ error: 'Failed to create fee profile locally' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          ...localProfile,
          finix_error: finixError,
          warning: 'Fee profile created locally but failed to sync with Finix' 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finixFeeProfile = await finixResponse.json();
    console.log('Finix fee profile created:', finixFeeProfile.id);

    // Create fee profile in database
    const { data: feeProfile, error: dbError } = await supabaseClient
      .from('merchant_fee_profiles')
      .insert({
        merchant_id: merchantId,
        finix_fee_profile_id: finixFeeProfile.id,
        finix_application_id: finixFeeProfile.application,
        basis_points: finixFeeProfile.basis_points,
        fixed_fee: finixFeeProfile.fixed_fee,
        ach_basis_points: finixFeeProfile.ach_basis_points,
        ach_fixed_fee: finixFeeProfile.ach_fixed_fee,
        ach_basis_points_fee_limit: finixFeeProfile.ach_basis_points_fee_limit,
        ach_credit_return_fixed_fee: finixFeeProfile.ach_credit_return_fixed_fee,
        ach_debit_return_fixed_fee: finixFeeProfile.ach_debit_return_fixed_fee,
        dispute_fixed_fee: finixFeeProfile.dispute_fixed_fee,
        dispute_inquiry_fixed_fee: finixFeeProfile.dispute_inquiry_fixed_fee,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating fee profile in database:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to create fee profile in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fee profile created successfully:', feeProfile.id);

    return new Response(
      JSON.stringify(feeProfile),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-merchant-fee-profile function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});