import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { FinixAPI } from '../shared/finixAPI.ts';
import { Logger } from '../shared/logger.ts';

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
    const { merchantId } = await req.json();

    if (!merchantId) {
      return new Response(
        JSON.stringify({ error: 'Merchant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get merchant data to verify it exists and get finix_merchant_id
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, finix_merchant_id')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      Logger.error('Merchant not found', merchantError);
      return new Response(
        JSON.stringify({ error: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!merchant.finix_merchant_id) {
      return new Response(
        JSON.stringify({ error: 'Merchant does not have a Finix merchant ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch payout profile from Finix API
    const finixAPI = new FinixAPI();
    let finixProfile;

    try {
      finixProfile = await finixAPI.getPayoutProfile(merchant.finix_merchant_id);
    } catch (error) {
      Logger.error('Finix API error', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payout profile from Finix', details: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!finixProfile) {
      return new Response(
        JSON.stringify({ error: 'No payout profile found for this merchant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    Logger.info('Finix payout profile fetched', { id: finixProfile.id, type: finixProfile.type });

    // Transform Finix profile to our database format
    let profileData: any = {
      merchant_id: merchantId,
      finix_payout_profile_id: finixProfile.id,
      type: finixProfile.type,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    };

    if (finixProfile.type === 'NET') {
      profileData = {
        ...profileData,
        net_frequency: finixProfile.net.frequency,
        net_submission_delay_days: finixProfile.net.submission_delay_days,
        net_payment_instrument_id: finixProfile.net.payment_instrument_id,
        net_rail: finixProfile.net.rail,
      };
    } else if (finixProfile.type === 'GROSS') {
      profileData = {
        ...profileData,
        gross_payouts_frequency: finixProfile.gross.payouts.frequency,
        gross_payouts_submission_delay_days: finixProfile.gross.payouts.submission_delay_days,
        gross_payouts_payment_instrument_id: finixProfile.gross.payouts.payment_instrument_id,
        gross_payouts_rail: finixProfile.gross.payouts.rail,
        gross_fees_frequency: finixProfile.gross.fees.frequency,
        gross_fees_day_of_month: finixProfile.gross.fees.day_of_month,
        gross_fees_submission_delay_days: finixProfile.gross.fees.submission_delay_days,
        gross_fees_payment_instrument_id: finixProfile.gross.fees.payment_instrument_id,
        gross_fees_rail: finixProfile.gross.fees.rail,
      };
    }

    // Upsert the payout profile in our database
    const { data: savedProfile, error: saveError } = await supabase
      .from('merchant_payout_profiles')
      .upsert(profileData, { onConflict: 'merchant_id' })
      .select()
      .single();

    if (saveError) {
      Logger.error('Error saving payout profile', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save payout profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: savedProfile,
        finixProfile: finixProfile 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    Logger.error('Error in fetch-merchant-payout-profile', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});