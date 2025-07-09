import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { merchantId, profileData } = await req.json();

    if (!merchantId || !profileData) {
      return new Response(
        JSON.stringify({ error: 'Merchant ID and profile data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get merchant and existing payout profile
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, finix_merchant_id')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      console.error('Merchant not found:', merchantError);
      return new Response(
        JSON.stringify({ error: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from('merchant_payout_profiles')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (profileError) {
      console.error('Payout profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Payout profile not found. Please sync from Finix first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Finix API payload based on type
    let finixPayload: any = {
      type: profileData.type,
      time_zone: "America/New_York",
      start_time: null,
    };

    if (profileData.type === 'NET') {
      finixPayload.net = {
        frequency: profileData.net_frequency,
        submission_delay_days: profileData.net_submission_delay_days || 0,
        payment_instrument_id: profileData.net_payment_instrument_id,
        rail: profileData.net_rail,
      };
    } else if (profileData.type === 'GROSS') {
      const feesConfig = {
        frequency: profileData.gross_fees_frequency,
        submission_delay_days: profileData.gross_fees_submission_delay_days || 0,
        payment_instrument_id: profileData.gross_fees_payment_instrument_id,
        rail: profileData.gross_fees_rail,
      };

      // Always include day_of_month as 1 if frequency is MONTHLY
      if (profileData.gross_fees_frequency === 'MONTHLY') {
        feesConfig.day_of_month = 1;
      }

      finixPayload.gross = {
        payouts: {
          frequency: profileData.gross_payouts_frequency,
          submission_delay_days: profileData.gross_payouts_submission_delay_days || 0,
          payment_instrument_id: profileData.gross_payouts_payment_instrument_id,
          rail: profileData.gross_payouts_rail,
        },
        fees: feesConfig,
      };
    }

    console.log('Updating Finix payout profile:', JSON.stringify(finixPayload, null, 2));

    // Update payout profile in Finix
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    if (!finixApplicationId || !finixApiSecret) {
      console.error('Missing Finix credentials:', { 
        hasApplicationId: !!finixApplicationId, 
        hasApiSecret: !!finixApiSecret 
      });
      return new Response(
        JSON.stringify({ error: 'Finix API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const baseUrl = finixEnvironment === 'live' 
      ? 'https://finix.payments-api.com' 
      : 'https://finix.sandbox-payments-api.com';

    const finixResponse = await fetch(
      `${baseUrl}/payout_profiles/${existingProfile.finix_payout_profile_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(finixApplicationId + ':' + finixApiSecret)}`,
          'Content-Type': 'application/json',
          'Finix-Version': '2022-02-01',
        },
        body: JSON.stringify(finixPayload),
      }
    );

    if (!finixResponse.ok) {
      const errorText = await finixResponse.text();
      console.error('Finix API error:', errorText);
      
      // Update local profile with error status
      await supabase
        .from('merchant_payout_profiles')
        .update({ 
          sync_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', merchantId);

      return new Response(
        JSON.stringify({ error: 'Failed to update payout profile in Finix', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedFinixProfile = await finixResponse.json();
    console.log('Updated Finix profile:', JSON.stringify(updatedFinixProfile, null, 2));

    // Update local database with new profile data
    const dbUpdateData = {
      ...profileData,
      merchant_id: merchantId,
      finix_payout_profile_id: existingProfile.finix_payout_profile_id,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: savedProfile, error: saveError } = await supabase
      .from('merchant_payout_profiles')
      .update(dbUpdateData)
      .eq('merchant_id', merchantId)
      .select()
      .single();

    if (saveError) {
      console.error('Error updating local payout profile:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to update local payout profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: savedProfile,
        finixProfile: updatedFinixProfile 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update-merchant-payout-profile:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});