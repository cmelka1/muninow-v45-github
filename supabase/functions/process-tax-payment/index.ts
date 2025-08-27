import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessTaxPaymentRequest {
  taxType: string;
  taxPeriodStart: string;
  taxPeriodEnd: string;
  taxYear: number;
  customerId: string;
  merchantId: string;
  paymentInstrumentId: string;
  idempotencyId: string;
  fraudSessionId?: string;
  calculationNotes: string;
  totalAmountDue: string;
  payer: {
    firstName: string;
    lastName: string;
    email: string;
    ein?: string;
    phone?: string;
    businessName?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
}

interface FinixTransferRequest {
  merchant: string;
  currency: string;
  amount: number;
  source: string;
  fraud_session_id?: string;
  idempotency_id: string;
}

interface FinixTransferResponse {
  id: string;
  amount: number;
  currency: string;
  state: string;
  failure_code?: string;
  failure_message?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// Tax type mapping function
function normalizeTaxType(displayTaxType: string): string {
  const taxTypeMap: Record<string, string> = {
    'Food & Beverage': 'food_beverage',
    'Hotel & Motel': 'hotel_motel',
    'Amusement': 'amusement',
    // Also support technical names in case they're already normalized
    'food_beverage': 'food_beverage',
    'hotel_motel': 'hotel_motel',
    'amusement': 'amusement'
  };
  
  const normalized = taxTypeMap[displayTaxType];
  if (!normalized) {
    throw new Error(`Invalid tax type: ${displayTaxType}. Supported types: Food & Beverage, Hotel & Motel, Amusement`);
  }
  
  return normalized;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase clients
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Parse request body
    const { 
      taxType, taxPeriodStart, taxPeriodEnd, taxYear, customerId, merchantId,
      paymentInstrumentId, idempotencyId, fraudSessionId, calculationNotes, totalAmountDue, payer 
    }: ProcessTaxPaymentRequest = await req.json();

    // Normalize tax type to database format
    const normalizedTaxType = normalizeTaxType(taxType);
    console.log('Processing tax payment:', { taxType, normalizedTaxType, paymentInstrumentId, idempotencyId });

    // Check for duplicate idempotency ID
    const { data: existingPayment } = await supabaseServiceRole
      .from('payment_history')
      .select('id, transfer_state')
      .eq('idempotency_id', idempotencyId)
      .maybeSingle();

    if (existingPayment) {
      console.log('Duplicate idempotency ID detected:', idempotencyId);
      return new Response(
        JSON.stringify({ 
          error: 'Payment already processed',
          transfer_state: existingPayment.transfer_state 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch payment instrument details
    const { data: paymentInstrument, error: piError } = await supabaseServiceRole
      .from('user_payment_instruments')
      .select('*')
      .eq('id', paymentInstrumentId)
      .eq('user_id', user.id)
      .eq('enabled', true)
      .maybeSingle();

    if (piError || !paymentInstrument) {
      throw new Error('Payment instrument not found or access denied');
    }

    // Fetch merchant details
    const { data: merchant, error: merchantError } = await supabaseServiceRole
      .from('merchants')
      .select(`
        *,
        merchant_fee_profiles!inner(*)
      `)
      .eq('id', merchantId)
      .maybeSingle();

    if (merchantError || !merchant) {
      throw new Error('Merchant not found');
    }

    // Validate finix_merchant_id is present
    if (!merchant.finix_merchant_id) {
      throw new Error('Merchant is not configured for Finix payment processing');
    }

    const feeProfile = merchant.merchant_fee_profiles[0];
    if (!feeProfile) {
      throw new Error('Merchant fee profile not found');
    }

    // Calculate tax amount from totalAmountDue - convert from dollars to cents
    // Remove commas before parsing to handle formatted numbers like "1,000.00"
    const cleanedTotalAmountDue = totalAmountDue.replace(/,/g, '');
    const baseAmountDollars = parseFloat(cleanedTotalAmountDue);
    if (isNaN(baseAmountDollars) || baseAmountDollars <= 0) {
      throw new Error('Invalid tax amount: must be a valid number greater than 0');
    }
    const baseAmount = Math.round(baseAmountDollars * 100); // Convert dollars to cents

    // Calculate service fees using hardcoded rates for tax payments
    const isCard = paymentInstrument.instrument_type === 'PAYMENT_CARD';
    const basisPoints = isCard ? 300 : 150; // 3% for cards, 1.5% for ACH
    const fixedFee = 50; // $0.50 fixed fee for both card and ACH
    
    // Use grossed-up calculation to match frontend
    const percentageDecimal = basisPoints / 10000;
    const expectedTotal = Math.round((baseAmount + fixedFee) / (1 - percentageDecimal));
    const serviceFee = expectedTotal - baseAmount;
    const totalAmount = expectedTotal;

    console.log('Fee calculation:', { baseAmount, serviceFee, totalAmount, basisPoints, fixedFee });

    // Use atomic function to create tax submission and payment record
    const { data: atomicResult, error: atomicError } = await supabaseServiceRole
      .rpc('create_tax_submission_with_payment', {
        p_user_id: user.id,
        p_customer_id: customerId,
        p_merchant_id: merchantId,
        p_tax_type: normalizedTaxType,
        p_tax_period_start: taxPeriodStart,
        p_tax_period_end: taxPeriodEnd,
        p_tax_year: taxYear,
        p_amount_cents: baseAmount,
        p_calculation_notes: calculationNotes,
        p_total_amount_due_cents: baseAmount,
        p_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        p_finix_merchant_id: merchant.finix_merchant_id,
        p_service_fee_cents: serviceFee,
        p_total_amount_cents: totalAmount,
        p_payment_type: paymentInstrument.instrument_type,
        p_idempotency_id: idempotencyId,
        p_fraud_session_id: fraudSessionId,
        p_card_brand: paymentInstrument.card_brand,
        p_card_last_four: paymentInstrument.card_last_four,
        p_bank_last_four: paymentInstrument.bank_last_four,
        p_merchant_name: merchant.merchant_name,
        p_category: merchant.category,
        p_subcategory: merchant.subcategory,
        p_statement_descriptor: merchant.statement_descriptor,
        p_first_name: payer.firstName,
        p_last_name: payer.lastName,
        p_user_email: payer.email,
        p_payer_ein: payer.ein || '',
        p_payer_phone: payer.phone || '',
        p_payer_street_address: payer.address?.street || '',
        p_payer_city: payer.address?.city || '',
        p_payer_state: payer.address?.state || '',
        p_payer_zip_code: payer.address?.zipCode || '',
        p_payer_business_name: payer.businessName || '',
      });

    if (atomicError || !atomicResult?.success) {
      console.error('Failed to create tax submission and payment records:', atomicError);
      throw new Error('Failed to create tax submission and payment records');
    }

    const { tax_submission_id: taxSubmissionId, payment_history_id: paymentHistoryId } = atomicResult;

    // Get Finix credentials
    const finixApplicationId = Deno.env.get("FINIX_APPLICATION_ID");
    const finixApiSecret = Deno.env.get("FINIX_API_SECRET");
    const finixEnvironment = Deno.env.get("FINIX_ENVIRONMENT") || "sandbox";
    
    if (!finixApplicationId || !finixApiSecret) {
      throw new Error("Finix API credentials not configured");
    }

    // Determine Finix API URL based on environment
    const finixBaseUrl = finixEnvironment === "live" 
      ? "https://finix.payments-api.com"
      : "https://finix.sandbox-payments-api.com";

    // Prepare Finix transfer request
    const transferRequest: FinixTransferRequest = {
      merchant: merchant.finix_merchant_id,
      currency: 'USD',
      amount: totalAmount,
      source: paymentInstrument.finix_payment_instrument_id,
      idempotency_id: idempotencyId
    };

    if (fraudSessionId) {
      transferRequest.fraud_session_id = fraudSessionId;
    }

    console.log('Creating Finix transfer:', transferRequest);

    // Make request to Finix API
    const finixResponse = await fetch(`${finixBaseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01',
        'Authorization': `Basic ${btoa(finixApplicationId + ':' + finixApiSecret)}`
      },
      body: JSON.stringify(transferRequest)
    });

    const finixData: FinixTransferResponse = await finixResponse.json();

    console.log("Finix transfer response:", { 
      status: finixResponse.status, 
      transfer_id: finixData.id,
      state: finixData.state 
    });

    // Update payment history with Finix response
    const updateData: any = {
      raw_finix_response: finixData,
      updated_at: new Date().toISOString()
    };

    if (finixResponse.ok && finixData.id) {
      updateData.finix_transfer_id = finixData.id;
      updateData.transfer_state = finixData.state || 'PENDING';
      updateData.finix_created_at = finixData.created_at;
      updateData.finix_updated_at = finixData.updated_at;
      updateData.payment_status = 'paid';
    } else {
      updateData.transfer_state = 'FAILED';
      updateData.failure_code = finixData.failure_code || 'API_ERROR';
      updateData.failure_message = finixData.failure_message || 'Finix API request failed';
      updateData.payment_status = 'failed';
    }

    await supabaseServiceRole
      .from('payment_history')
      .update(updateData)
      .eq('id', paymentHistoryId);

    // If transfer succeeded, update the tax submission
    if (finixResponse.ok && finixData.state === 'SUCCEEDED') {
      const { error: taxUpdateError } = await supabaseServiceRole
        .from('tax_submissions')
        .update({
          payment_status: 'paid',
          transfer_state: 'SUCCEEDED',
          finix_transfer_id: finixData.id,
          paid_at: new Date().toISOString(),
          submission_status: 'submitted'
        })
        .eq('id', taxSubmissionId);

      if (taxUpdateError) {
        console.error('Failed to update tax submission:', taxUpdateError);
      }
    } else if (!finixResponse.ok) {
      // If Finix call fails, rollback the transaction by deleting the created records
      console.log('Finix transfer failed, rolling back transaction...');
      
      await supabaseServiceRole
        .from('payment_history')
        .delete()
        .eq('id', paymentHistoryId);
      
      await supabaseServiceRole
        .from('tax_submissions')
        .delete()
        .eq('id', taxSubmissionId);

      return new Response(
        JSON.stringify({
          success: false,
          error: updateData.failure_message,
          payment_history_id: paymentHistoryId
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: finixData.id,
        transfer_state: finixData.state,
        payment_history_id: paymentHistoryId,
        tax_submission_id: taxSubmissionId,
        amount_cents: totalAmount,
        redirect_url: `/taxes`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Tax payment processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process tax payment' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});