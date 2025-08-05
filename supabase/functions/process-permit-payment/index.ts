import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessPermitPaymentRequest {
  permit_id: string;
  payment_instrument_id: string;
  total_amount_cents: number;
  idempotency_id: string;
  fraud_session_id?: string;
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
  state: string;
  currency: string;
  source: string;
  merchant: string;
  created_at: string;
  updated_at: string;
  failure_code?: string;
  failure_message?: string;
  fee?: number;
  statement_descriptor?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Create service role client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Parse request body
    const body: ProcessPermitPaymentRequest = await req.json();
    const { 
      permit_id, 
      payment_instrument_id, 
      total_amount_cents, 
      idempotency_id,
      fraud_session_id 
    } = body;

    console.log("Processing permit payment:", { 
      permit_id, 
      payment_instrument_id, 
      total_amount_cents, 
      user_id: user.id 
    });

    // Validate input
    if (!permit_id || !payment_instrument_id || !total_amount_cents || !idempotency_id) {
      throw new Error("Missing required parameters");
    }

    // Check for duplicate idempotency_id
    const { data: existingPayment } = await supabaseService
      .from("payment_history")
      .select("id, transfer_state")
      .eq("idempotency_id", idempotency_id)
      .single();

    if (existingPayment) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_history_id: existingPayment.id,
          message: "Payment already processed",
          transfer_state: existingPayment.transfer_state
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get permit details and validate ownership
    const { data: permit, error: permitError } = await supabaseService
      .from("permit_applications")
      .select("*")
      .eq("permit_id", permit_id)
      .eq("user_id", user.id)
      .eq("application_status", "approved")
      .single();

    if (permitError || !permit) {
      throw new Error("Permit not found, access denied, or not approved for payment");
    }

    // Get payment instrument and validate ownership
    const { data: paymentInstrument, error: piError } = await supabaseService
      .from("user_payment_instruments")
      .select("*")
      .eq("id", payment_instrument_id)
      .eq("user_id", user.id)
      .eq("enabled", true)
      .single();

    if (piError || !paymentInstrument) {
      throw new Error("Payment instrument not found or access denied");
    }

    // Calculate service fee based on payment instrument type
    const isCard = paymentInstrument.instrument_type === 'PAYMENT_CARD';
    const basisPoints = isCard ? (permit.basis_points || 250) : (permit.ach_basis_points || 20);
    const fixedFee = isCard ? (permit.fixed_fee || 50) : (permit.ach_fixed_fee || 50);
    
    const baseAmount = permit.payment_amount_cents || permit.total_amount_cents || 0;
    const percentageFee = Math.round((baseAmount * basisPoints) / 10000);
    const calculatedServiceFee = percentageFee + fixedFee;
    const expectedTotal = baseAmount + calculatedServiceFee;

    // Validate total amount matches calculation
    if (Math.abs(total_amount_cents - expectedTotal) > 1) { // Allow 1 cent rounding difference
      throw new Error(`Total amount mismatch. Expected: ${expectedTotal}, Received: ${total_amount_cents}`);
    }

    // Get Finix merchant ID from the permit
    const finixMerchantId = permit.finix_merchant_id;
    if (!finixMerchantId) {
      throw new Error("Merchant not configured with Finix");
    }

    // Determine payment type
    const paymentType = paymentInstrument.instrument_type === 'PAYMENT_CARD' ? 'Card' : 'Bank Account';

    // Get user profile for payment record
    const { data: userProfile } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Create payment history record with permit details
    const { data: paymentHistory, error: phError } = await supabaseService
      .from("payment_history")
      .insert({
        user_id: user.id,
        permit_id: permit_id,
        customer_id: permit.customer_id,
        finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        finix_merchant_id: finixMerchantId,
        amount_cents: baseAmount,
        service_fee_cents: calculatedServiceFee,
        total_amount_cents: total_amount_cents,
        currency: 'USD',
        payment_type: paymentType,
        idempotency_id: idempotency_id,
        fraud_session_id: fraud_session_id,
        transfer_state: 'PENDING',
        card_brand: paymentInstrument.card_brand,
        card_last_four: paymentInstrument.card_last_four,
        bank_last_four: paymentInstrument.bank_last_four,
        // Merchant Information
        merchant_name: permit.merchant_name,
        category: 'Property-Related',
        subcategory: 'Building Permits',
        doing_business_as: permit.merchant_name,
        statement_descriptor: permit.merchant_name,
        // Customer Information from user profile
        customer_first_name: userProfile?.first_name,
        customer_last_name: userProfile?.last_name,
        customer_email: userProfile?.email,
        customer_street_address: userProfile?.street_address,
        customer_apt_number: userProfile?.apt_number,
        customer_city: userProfile?.city,
        customer_state: userProfile?.state,
        customer_zip_code: userProfile?.zip_code,
        // Business Legal Information (if applicable)
        business_legal_name: userProfile?.business_legal_name,
        entity_type: userProfile?.account_type,
        // Permit-specific information
        bill_type: 'permit',
        issue_date: permit.created_at,
        due_date: permit.created_at, // Permits are due immediately upon approval
        original_amount_cents: baseAmount,
        payment_status: 'pending',
        bill_status: 'unpaid'
      })
      .select()
      .single();

    if (phError) {
      console.error("Error creating payment history:", phError);
      throw new Error("Failed to create payment record");
    }

    // Prepare Finix transfer request
    const finixRequest: FinixTransferRequest = {
      merchant: finixMerchantId,
      currency: "USD",
      amount: total_amount_cents,
      source: paymentInstrument.finix_payment_instrument_id,
      idempotency_id: idempotency_id
    };

    if (fraud_session_id) {
      finixRequest.fraud_session_id = fraud_session_id;
    }

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

    // Create Finix transfer
    const finixResponse = await fetch(`${finixBaseUrl}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Finix-Version": "2022-02-01",
        "Authorization": `Basic ${btoa(finixApplicationId + ":" + finixApiSecret)}`
      },
      body: JSON.stringify(finixRequest)
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
    } else {
      updateData.transfer_state = 'FAILED';
      updateData.failure_code = finixData.failure_code || 'API_ERROR';
      updateData.failure_message = finixData.failure_message || 'Finix API request failed';
    }

    await supabaseService
      .from("payment_history")
      .update(updateData)
      .eq("id", paymentHistory.id);

    // If transfer succeeded, update the permit
    if (finixResponse.ok && finixData.state === 'SUCCEEDED') {
      await supabaseService
        .from("permit_applications")
        .update({
          service_fee_cents: calculatedServiceFee,
          total_amount_cents: total_amount_cents,
          payment_status: 'paid',
          payment_processed_at: new Date().toISOString(),
          payment_reference: finixData.id,
          updated_at: new Date().toISOString()
        })
        .eq("permit_id", permit_id);

      console.log("Permit updated successfully for payment:", finixData.id);
    }

    // Return response
    if (!finixResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: updateData.failure_message,
          payment_history_id: paymentHistory.id
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_history_id: paymentHistory.id,
        transfer_id: finixData.id,
        transfer_state: finixData.state,
        amount_cents: total_amount_cents,
        redirect_url: `/permit/${permit_id}?payment=success`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Permit payment error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});