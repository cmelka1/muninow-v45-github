import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
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
    Logger.info('=== SERVICE FEE CALCULATION REQUEST ===');
    
    const { baseAmountCents, paymentMethodType, paymentInstrumentId, merchantId } = await req.json();
    
    Logger.info('Request params', {
      baseAmountCents,
      paymentMethodType,
      paymentInstrumentId,
      merchantId
    });

    // Validate inputs
    if (!baseAmountCents || baseAmountCents <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid base amount' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine if it's a card payment
    let isCard = true; // Default to card
    
    if (paymentMethodType) {
      isCard = paymentMethodType === 'card' || paymentMethodType === 'PAYMENT_CARD' || paymentMethodType === 'google-pay' || paymentMethodType === 'apple-pay';
    } else if (paymentInstrumentId) {
      // Query payment instrument to determine type
      const { data: instrument, error } = await supabase
        .from('user_payment_instruments')
        .select('instrument_type')
        .eq('id', paymentInstrumentId)
        .single();

      if (error) {
        Logger.error('Error fetching payment instrument', error);
        isCard = true;
      } else {
        isCard = instrument.instrument_type === 'PAYMENT_CARD';
      }
    }

    // Resolve Merchant ID
    let targetMerchantId = merchantId;
    
    // If no direct merchantId, try to get it through payment instrument
    if (!targetMerchantId && paymentInstrumentId) {
      const { data: userInstrument } = await supabase
        .from('user_payment_instruments')
        .select('user_id')
        .eq('id', paymentInstrumentId)
        .single();

      if (userInstrument?.user_id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('customer_id')
          .eq('id', userInstrument.user_id)
          .single();

        if (userProfile?.customer_id) {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('customer_id', userProfile.customer_id)
            .eq('subcategory', 'Other')
            .single();
          
          targetMerchantId = merchant?.id;
        }
      }
    }

    // Call RPC to calculate fees
    Logger.info('Calculating fees with RPC', { targetMerchantId, isCard, baseAmountCents });

    const { data: feeResult, error: feeError } = await supabase.rpc('preview_service_fee', {
      p_base_amount_cents: baseAmountCents,
      p_merchant_id: targetMerchantId || '00000000-0000-0000-0000-000000000000', // Handle null case safely
      p_is_card: isCard
    });

    if (feeError || !feeResult || !feeResult.success) {
      Logger.error('Fee calculation RPC error', feeError);
      throw new Error('Failed to calculate service fee');
    }

    const response = {
      success: true,
      baseAmount: baseAmountCents,
      serviceFee: feeResult.serviceFee,
      totalAmount: feeResult.totalAmount,
      isCard: feeResult.isCard,
      basisPoints: feeResult.basisPoints
    };

    Logger.info('Fee calculation result', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    Logger.error('Service fee calculation error', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to calculate service fee'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});