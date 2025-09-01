import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessServiceApplicationPaymentRequest {
  application_id: string;
  payment_instrument_id: string;
  total_amount_cents: number;
  idempotency_id: string;
  fraud_session_id: string;
}

interface FinixTransferRequest {
  merchant: string;
  currency: string;
  amount: number;
  source: string;
  idempotency_id: string;
  fraud_session_id: string;
}

interface FinixTransferResponse {
  state: string;
  id: string;
  fee?: number;
  amount?: number;
  currency?: string;
  trace_id?: string;
  raw_trace_id?: string;
  tags?: Record<string, any>;
}

serve(async (req) => {
  console.log(`[PROCESS-SERVICE-APPLICATION-PAYMENT] ${req.method} request received`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase clients
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseServiceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { headers: corsHeaders, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { headers: corsHeaders, status: 401 }
      );
    }

    const user = userData.user;
    console.log(`[PROCESS-SERVICE-APPLICATION-PAYMENT] User authenticated: ${user.id}`);

    // Parse request body
    const requestBody: ProcessServiceApplicationPaymentRequest = await req.json();
    console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Request parsed:", {
      application_id: requestBody.application_id,
      total_amount_cents: requestBody.total_amount_cents,
      idempotency_id: requestBody.idempotency_id,
    });

    // Check for duplicate idempotency ID
    const { data: existingPayment } = await supabaseServiceClient
      .from("payment_history")
      .select("id, payment_status")
      .eq("idempotency_id", requestBody.idempotency_id)
      .maybeSingle();

    if (existingPayment) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Duplicate idempotency ID found");
      return new Response(
        JSON.stringify({ 
          error: "Payment already processed",
          payment_id: existingPayment.id,
          status: existingPayment.payment_status
        }),
        { headers: corsHeaders, status: 409 }
      );
    }

    // Get service application and validate ownership (separate query like business license)
    const { data: application, error: appError } = await supabaseServiceClient
      .from("municipal_service_applications")
      .select("*")
      .eq("id", requestBody.application_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (appError || !application) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Application not found:", appError);
      return new Response(
        JSON.stringify({ error: "Service application not found or unauthorized" }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // Validate application status
    if (!["draft", "submitted"].includes(application.status)) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Invalid application status:", application.status);
      return new Response(
        JSON.stringify({ error: "Application cannot be paid in current status" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Get service tile details (separate query)
    const { data: tile, error: tileError } = await supabaseServiceClient
      .from("municipal_service_tiles")
      .select("*")
      .eq("id", application.tile_id)
      .maybeSingle();

    if (tileError || !tile) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Service tile not found:", tileError);
      return new Response(
        JSON.stringify({ error: "Service tile not found" }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // Get merchant details (separate query)
    const { data: merchant, error: merchantError } = await supabaseServiceClient
      .from("merchants")
      .select("*")
      .eq("id", tile.merchant_id)
      .maybeSingle();

    if (merchantError || !merchant) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Merchant not found:", merchantError);
      return new Response(
        JSON.stringify({ error: "Merchant not found" }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // Validate merchant configuration
    if (!merchant.finix_merchant_id) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Missing finix_merchant_id");
      return new Response(
        JSON.stringify({ error: "Merchant payment configuration incomplete" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Get merchant fee profile (separate query)
    const { data: merchantFeeProfiles, error: feeProfileError } = await supabaseServiceClient
      .from("merchant_fee_profiles")
      .select("*")
      .eq("merchant_id", merchant.id)
      .limit(1);

    const merchantFeeProfile = merchantFeeProfiles?.[0];
    if (feeProfileError) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Fee profile error:", feeProfileError);
    }

    // Validate payment instrument ownership
    const { data: paymentInstrument, error: piError } = await supabaseServiceClient
      .from("user_payment_instruments")
      .select("*")
      .eq("id", requestBody.payment_instrument_id)
      .eq("user_id", user.id)
      .eq("enabled", true)
      .maybeSingle();

    if (piError || !paymentInstrument) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Payment instrument not found:", piError);
      return new Response(
        JSON.stringify({ error: "Payment instrument not found or unauthorized" }),
        { headers: corsHeaders, status: 404 }
      );
    }

    // Calculate service fee (server-side validation)
    const baseAmount = tile.amount_cents;
    const isCard = paymentInstrument.instrument_type === 'PAYMENT_CARD';
    
    let basisPoints = 0;
    let fixedFee = 0;

    if (merchantFeeProfile) {
      if (isCard) {
        basisPoints = merchantFeeProfile.basis_points || 0;
        fixedFee = merchantFeeProfile.fixed_fee || 0;
      } else {
        basisPoints = merchantFeeProfile.ach_basis_points || 0;
        fixedFee = merchantFeeProfile.ach_fixed_fee || 0;
      }
    }

    // Grossed-up calculation: T = (A + F) / (1 - R)
    const percentageFee = basisPoints / 10000;
    const grossedUpAmount = Math.round((baseAmount + fixedFee) / (1 - percentageFee));
    const serviceFee = grossedUpAmount - baseAmount;

    console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Fee calculation:", {
      baseAmount,
      isCard,
      basisPoints,
      fixedFee,
      grossedUpAmount,
      serviceFee,
      requestedTotal: requestBody.total_amount_cents
    });

    // Validate calculated amount matches request (allow 2 cent tolerance for rounding)
    if (Math.abs(grossedUpAmount - requestBody.total_amount_cents) > 2) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Amount mismatch");
      return new Response(
        JSON.stringify({ 
          error: "Amount validation failed",
          calculated: grossedUpAmount,
          requested: requestBody.total_amount_cents
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Get Finix credentials
    const finixApplicationId = Deno.env.get("FINIX_APPLICATION_ID");
    const finixApiSecret = Deno.env.get("FINIX_API_SECRET");
    const finixEnvironment = Deno.env.get("FINIX_ENVIRONMENT") || "sandbox";

    if (!finixApplicationId || !finixApiSecret) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Missing Finix credentials");
      return new Response(
        JSON.stringify({ error: "Payment system configuration error" }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // Determine Finix base URL based on environment
    const finixBaseUrl = finixEnvironment === "live" 
      ? "https://finix.payments-api.com" 
      : "https://finix.sandbox-payments-api.com";

    // Validate fraud session ID
    if (!requestBody.fraud_session_id || requestBody.fraud_session_id.trim() === '') {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Warning: Empty fraud session ID");
    }

    // Process payment via Finix
    const finixTransferData: FinixTransferRequest = {
      merchant: merchant.finix_merchant_id,
      currency: "USD",
      amount: grossedUpAmount,
      source: paymentInstrument.finix_payment_instrument_id,
      idempotency_id: requestBody.idempotency_id,
      fraud_session_id: requestBody.fraud_session_id || "",
    };

    console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Initiating Finix transfer");
    const finixResponse = await fetch(`${finixBaseUrl}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Finix-Version": "2022-02-01",
        "Authorization": `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`,
      },
      body: JSON.stringify(finixTransferData),
    });

    const finixResult: FinixTransferResponse = await finixResponse.json();
    console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Finix response:", {
      status: finixResponse.status,
      state: finixResult.state,
      id: finixResult.id
    });

    if (!finixResponse.ok) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Finix transfer failed:", finixResult);
      return new Response(
        JSON.stringify({ 
          error: "Payment processing failed", 
          details: finixResult 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Create payment history record
    const { data: paymentHistory, error: paymentError } = await supabaseServiceClient
      .from("payment_history")
      .insert({
        user_id: user.id,
        customer_id: tile.customer_id,
        service_application_id: application.id,
        amount_cents: baseAmount,
        service_fee_cents: serviceFee,
        total_amount_cents: grossedUpAmount,
        payment_type: isCard ? "PAYMENT_CARD" : "BANK_ACCOUNT",
        payment_status: finixResult.state === "SUCCEEDED" ? "completed" : "pending",
        payment_method_type: paymentInstrument.instrument_type,
        payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        idempotency_id: requestBody.idempotency_id,
        fraud_session_id: requestBody.fraud_session_id,
        card_brand: paymentInstrument.card_brand,
        card_last_four: paymentInstrument.card_last_four,
        bank_last_four: paymentInstrument.bank_last_four,
        merchant_id: merchant.id,
        finix_merchant_id: merchant.finix_merchant_id,
        merchant_name: merchant.merchant_name,
        transfer_state: finixResult.state,
        finix_transfer_id: finixResult.id,
      })
      .select()
      .single();

    if (paymentError) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Payment history creation failed:", paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to record payment" }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // Update service application with payment details
    const updateData: any = {
      payment_status: finixResult.state === "SUCCEEDED" ? "paid" : "pending",
      payment_id: paymentHistory.id,
      service_fee_cents: serviceFee,
      total_amount_cents: grossedUpAmount,
      finix_transfer_id: finixResult.id,
      idempotency_id: requestBody.idempotency_id,
      fraud_session_id: requestBody.fraud_session_id,
      updated_at: new Date().toISOString(),
    };

    // For non-review applications, automatically approve and complete
    if (!tile.requires_review && finixResult.state === "SUCCEEDED") {
      updateData.status = "approved";
      updateData.paid_at = new Date().toISOString();
    } else if (finixResult.state === "SUCCEEDED") {
      updateData.status = "submitted";
    }

    const { error: updateError } = await supabaseServiceClient
      .from("municipal_service_applications")
      .update(updateData)
      .eq("id", application.id);

    if (updateError) {
      console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Application update failed:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update application" }),
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Payment processed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentHistory.id,
        application_id: application.id,
        transfer_id: finixResult.id,
        status: updateData.status || application.status,
        payment_status: updateData.payment_status,
        amount_cents: grossedUpAmount,
        auto_approved: !tile.requires_review && finixResult.state === "SUCCEEDED",
      }),
      { headers: corsHeaders, status: 200 }
    );

  } catch (error) {
    console.log("[PROCESS-SERVICE-APPLICATION-PAYMENT] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});