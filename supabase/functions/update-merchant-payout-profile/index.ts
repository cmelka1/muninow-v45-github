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
      Logger.error('Merchant not found', merchantError);
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
      Logger.error('Payout profile not found', profileError);
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
      const netConfig: any = {
        frequency: profileData.net_frequency,
        submission_delay_days: profileData.net_submission_delay_days || 0,
        payment_instrument_id: profileData.net_payment_instrument_id,
        rail: profileData.net_rail,
      };

      // Always include day_of_month as 1 if frequency is MONTHLY
      if (profileData.net_frequency === 'MONTHLY') {
        netConfig.day_of_month = 1;
      }

      finixPayload.net = netConfig;
    } else if (profileData.type === 'GROSS') {
      const feesConfig: any = {
        frequency: profileData.gross_fees_frequency,
        submission_delay_days: profileData.gross_fees_submission_delay_days || 0,
        payment_instrument_id: profileData.gross_fees_payment_instrument_id,
        rail: profileData.gross_fees_rail,
      };

      // Always include day_of_month as 1 if frequency is MONTHLY
      if (profileData.gross_fees_frequency === 'MONTHLY') {
        feesConfig.day_of_month = 1;
      }

      const payoutsConfig: any = {
        frequency: profileData.gross_payouts_frequency,
        submission_delay_days: profileData.gross_payouts_submission_delay_days || 0,
        payment_instrument_id: profileData.gross_payouts_payment_instrument_id,
        rail: profileData.gross_payouts_rail,
      };

      // Always include day_of_month as 1 if frequency is MONTHLY
      if (profileData.gross_payouts_frequency === 'MONTHLY') {
        payoutsConfig.day_of_month = 1;
      }

      finixPayload.gross = {
        payouts: payoutsConfig,
        fees: feesConfig,
      };
    }

    Logger.info('Updating Finix payout profile', finixPayload);

    // Update payout profile in Finix
    const finixAPI = new FinixAPI();
    let updatedFinixProfile;

    try {
      updatedFinixProfile = await finixAPI.updatePayoutProfile(existingProfile.finix_payout_profile_id, finixPayload);
    } catch (error) {
      Logger.error('Finix API error', error);
      const errorText = error instanceof Error ? error.message : String(error);

      // Check if the payout profile is no longer active
      if (errorText.includes('no longer active')) {
        Logger.info('Payout profile is inactive, creating a new one...');
        
        try {
          const newFinixProfile = await finixAPI.createPayoutProfile(merchant.finix_merchant_id, finixPayload);
          Logger.info('Created new Finix profile', newFinixProfile);

          // Update local database with new profile data
          const dbUpdateData = {
            ...profileData,
            merchant_id: merchantId,
            finix_payout_profile_id: newFinixProfile.id,
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
             Logger.error('Error updating local payout profile', saveError);
             return new Response(
              JSON.stringify({ error: 'Failed to update local payout profile' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              profile: savedProfile,
              finixProfile: newFinixProfile,
              message: 'Created new payout profile (previous was inactive)'
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );

        } catch (createError) {
           Logger.error('Failed to create new payout profile', createError);
           await supabase
            .from('merchant_payout_profiles')
            .update({ 
              sync_status: 'error',
              updated_at: new Date().toISOString()
            })
            .eq('merchant_id', merchantId);

           return new Response(
            JSON.stringify({ error: 'Failed to create new payout profile in Finix', details: createError instanceof Error ? createError.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Update local profile with error status for other errors
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
    
    Logger.info('Updated Finix profile successfully', { id: updatedFinixProfile.id });

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
      Logger.error('Error updating local payout profile', saveError);
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
    Logger.error('Error in update-merchant-payout-profile', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});