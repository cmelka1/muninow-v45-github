import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import the shared fee calculation utility
const calculateServiceFeeUtil = (params: {
  baseAmountCents: number;
  isCard: boolean;
  cardBasisPoints?: number;
  cardFixedFeeCents?: number;
  achBasisPoints?: number;
  achFixedFeeCents?: number;
}) => {
  const {
    baseAmountCents,
    isCard,
    cardBasisPoints = 300,
    cardFixedFeeCents = 50,
    achBasisPoints = 150,
    achFixedFeeCents = 50
  } = params;

  const basisPoints = isCard ? cardBasisPoints : achBasisPoints;
  const fixedFeeCents = isCard ? cardFixedFeeCents : achFixedFeeCents;

  const serviceFeePercentageCents = Math.round((baseAmountCents * basisPoints) / 10000);
  const totalServiceFeeCents = serviceFeePercentageCents + fixedFeeCents;
  const totalChargeCents = baseAmountCents + totalServiceFeeCents;

  return {
    baseAmountCents,
    serviceFeePercentageCents,
    serviceFeeFixedCents: fixedFeeCents,
    totalServiceFeeCents,
    totalChargeCents,
    basisPoints,
    isCard
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SERVICE FEE CALCULATION REQUEST ===');
    
    const { baseAmountCents, paymentMethodType, paymentInstrumentId } = await req.json();
    
    console.log('Request params:', {
      baseAmountCents,
      paymentMethodType,
      paymentInstrumentId
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

    // Determine if it's a card payment
    let isCard = true; // Default to card
    
    if (paymentMethodType) {
      // Direct payment method type provided
      isCard = paymentMethodType === 'card' || paymentMethodType === 'PAYMENT_CARD';
    } else if (paymentInstrumentId) {
      // Query payment instrument to determine type
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: instrument, error } = await supabase
        .from('user_payment_instruments')
        .select('instrument_type')
        .eq('id', paymentInstrumentId)
        .single();

      if (error) {
        console.error('Error fetching payment instrument:', error);
        // Fall back to card assumption
        isCard = true;
      } else {
        isCard = instrument.instrument_type === 'PAYMENT_CARD';
      }
    }

    // Calculate service fee using unified formula
    const feeCalculation = calculateServiceFeeUtil({
      baseAmountCents,
      isCard
    });

    console.log('Fee calculation result:', feeCalculation);

    return new Response(
      JSON.stringify({
        success: true,
        baseAmount: feeCalculation.baseAmountCents,
        serviceFee: feeCalculation.totalServiceFeeCents,
        totalAmount: feeCalculation.totalChargeCents,
        isCard: feeCalculation.isCard,
        basisPoints: feeCalculation.basisPoints
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Service fee calculation error:', error);
    
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