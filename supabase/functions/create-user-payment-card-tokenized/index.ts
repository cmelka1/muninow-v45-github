import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
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
    const { finixToken, nickname, addressOverride } = await req.json();

    Logger.info('Creating payment card from Finix token', {
      hasToken: !!finixToken,
      hasNickname: !!nickname,
      hasAddressOverride: !!addressOverride,
    });

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get User
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get Finix Buyer Identity from finix_identities table (created during signup)
    const { data: finixIdentity, error: identityError } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', user.id)
      .single();

    if (identityError || !finixIdentity?.finix_identity_id) {
      Logger.error('Finix Identity not found for user', { userId: user.id, error: identityError });
      throw new Error('Payment identity not found. Please complete account setup or contact support.');
    }

    const finixBuyerIdentityId = finixIdentity.finix_identity_id;
    Logger.info('Found Finix Buyer Identity', { userId: user.id, identityId: finixBuyerIdentityId });

    // Validate required fields
    if (!finixToken || !finixToken.startsWith('TK')) {
      throw new Error('Valid Finix token is required (must start with TK)');
    }

    // Initialize Finix API
    const finixAPI = new FinixAPI();

    Logger.info('Creating Finix payment instrument with token...');
    
    // Create payment instrument via Finix API using BUYER identity
    const instrumentResult = await finixAPI.createPaymentInstrument({
      type: 'TOKEN',
      identity: finixBuyerIdentityId,
      token: finixToken,
      billingAddress: addressOverride ? {
        line1: addressOverride.streetAddress,
        city: addressOverride.city,
        region: addressOverride.state,
        postal_code: addressOverride.zipCode,
        country: addressOverride.country || 'USA',
      } : undefined
    });


    if (!instrumentResult.success || !instrumentResult.data?.id) {
      Logger.error('Finix API error', instrumentResult.error);
      throw new Error(`Finix API error: ${instrumentResult.error}`);
    }

    const paymentInstrument = instrumentResult.data;
    Logger.info('Payment instrument created', { id: paymentInstrument.id });

    // Extract card details
    const cardBrand = paymentInstrument.card_brand || 'UNKNOWN';
    const cardLastFour = paymentInstrument.last_four || '0000';
    const cardExpMonth = paymentInstrument.expiration_month;
    const cardExpYear = paymentInstrument.expiration_year;

    // Generate display name
    const displayName = nickname || `${cardBrand} •••• ${cardLastFour}`;

    // Check if this should be the default payment method
    const { count } = await supabase
      .from('user_payment_instruments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('enabled', true);

    const isDefault = count === 0;

    // Store in user_payment_instruments with optimized data
    const { data: savedInstrument, error: saveError } = await supabase
      .from('user_payment_instruments')
      .insert({
        user_id: user.id,
        finix_payment_instrument_id: paymentInstrument.id,
        finix_identity_id: finixBuyerIdentityId,
        instrument_type: 'PAYMENT_CARD',
        nickname: nickname || null,
        is_default: isDefault,
        enabled: true,
        status: 'active',
        card_brand: cardBrand,
        card_last_four: cardLastFour,
        card_expiration_month: cardExpMonth,
        card_expiration_year: cardExpYear,
        billing_address_line1: addressOverride?.streetAddress,
        billing_city: addressOverride?.city,
        billing_region: addressOverride?.state,
        billing_postal_code: addressOverride?.zipCode,
        // Store only essential Finix data instead of full response
        raw_finix_response: {
          id: paymentInstrument.id,
          fingerprint: paymentInstrument.fingerprint,
          created_at: paymentInstrument.created_at,
          updated_at: paymentInstrument.updated_at,
          links: paymentInstrument.links?.self?.href
        },
        created_via: 'tokenized_form',
      })
      .select()
      .single();

    if (saveError) {
      Logger.error('Error saving payment instrument', saveError);
      throw new Error('Failed to save payment method');
    }

    Logger.info('Payment method saved successfully', { id: savedInstrument.id });

    return new Response(
      JSON.stringify({
        success: true,
        paymentInstrument: savedInstrument,
        message: 'Payment card added successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    Logger.error('Error creating payment card from token', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add payment card',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
