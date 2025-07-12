import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessTransferRequest {
  bill_id: string;
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
    const body: ProcessTransferRequest = await req.json();
    const { 
      bill_id, 
      payment_instrument_id, 
      total_amount_cents, 
      idempotency_id,
      fraud_session_id 
    } = body;

    console.log("Processing Finix transfer:", { 
      bill_id, 
      payment_instrument_id, 
      total_amount_cents, 
      user_id: user.id 
    });

    // Validate input
    if (!bill_id || !payment_instrument_id || !total_amount_cents || !idempotency_id) {
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

    // Get bill details and validate ownership
    const { data: bill, error: billError } = await supabaseService
      .from("master_bills")
      .select(`
        *,
        merchants!inner(finix_merchant_id, merchant_name)
      `)
      .eq("bill_id", bill_id)
      .eq("user_id", user.id)
      .single();

    if (billError || !bill) {
      throw new Error("Bill not found or access denied");
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
    const basisPoints = isCard ? (bill.basis_points || 250) : (bill.ach_basis_points || 20);
    const fixedFee = isCard ? (bill.fixed_fee || 50) : (bill.ach_fixed_fee || 50);
    
    const percentageFee = Math.round((bill.total_amount_cents * basisPoints) / 10000);
    const calculatedServiceFee = percentageFee + fixedFee;
    const expectedTotal = bill.total_amount_cents + calculatedServiceFee;

    // Validate total amount matches calculation
    if (Math.abs(total_amount_cents - expectedTotal) > 1) { // Allow 1 cent rounding difference
      throw new Error(`Total amount mismatch. Expected: ${expectedTotal}, Received: ${total_amount_cents}`);
    }

    // Get Finix merchant ID from the bill's merchant
    const finixMerchantId = bill.merchants?.finix_merchant_id;
    if (!finixMerchantId) {
      throw new Error("Merchant not configured with Finix");
    }

    // Determine payment type
    const paymentType = paymentInstrument.instrument_type === 'PAYMENT_CARD' ? 'Card' : 'Bank Account';

    // Create payment history record with payment method details and bill information
    const { data: paymentHistory, error: phError } = await supabaseService
      .from("payment_history")
      .insert({
        user_id: user.id,
        bill_id: bill_id,
        finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        finix_merchant_id: finixMerchantId,
        amount_cents: bill.total_amount_cents,
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
        merchant_name: bill.merchant_name || bill.merchants?.merchant_name,
        category: bill.category,
        subcategory: bill.subcategory,
        doing_business_as: bill.doing_business_as,
        statement_descriptor: bill.statement_descriptor,
        // Bill Identification & External Data
        external_bill_number: bill.external_bill_number,
        external_account_number: bill.external_account_number,
        data_source_system: bill.data_source_system,
        external_business_name: bill.external_business_name,
        external_customer_name: bill.external_customer_name,
        external_customer_address_line1: bill.external_customer_address_line1,
        external_customer_city: bill.external_customer_city,
        external_customer_state: bill.external_customer_state,
        external_customer_zip_code: bill.external_customer_zip_code,
        // Customer Information
        customer_first_name: bill.first_name,
        customer_last_name: bill.last_name,
        customer_email: bill.email,
        customer_street_address: bill.street_address,
        customer_apt_number: bill.apt_number,
        customer_city: bill.city,
        customer_state: bill.state,
        customer_zip_code: bill.zip_code,
        // Business Legal Information
        business_legal_name: bill.business_legal_name,
        business_address_line1: bill.business_address_line1,
        business_city: bill.business_city,
        business_state: bill.business_state,
        business_zip_code: bill.business_zip_code,
        entity_type: bill.entity_type,
        // Key Bill Details
        bill_type: bill.type,
        issue_date: bill.issue_date,
        due_date: bill.due_date,
        original_amount_cents: bill.original_amount_cents,
        payment_status: bill.payment_status,
        bill_status: bill.bill_status
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

    // If transfer succeeded, update the bill
    if (finixResponse.ok && finixData.state === 'SUCCEEDED') {
      const newPaidAmount = (bill.total_paid_cents || 0) + total_amount_cents;
      const newRemainingBalance = bill.total_amount_cents - newPaidAmount;
      
      await supabaseService
        .from("master_bills")
        .update({
          calculated_fee_cents: calculatedServiceFee,
          total_paid_cents: newPaidAmount,
          remaining_balance_cents: Math.max(0, newRemainingBalance),
          payment_status: newRemainingBalance <= 0 ? 'paid' : 'partially_paid',
          external_payment_reference: finixData.id,
          payment_processed_by: 'finix',
          updated_at: new Date().toISOString()
        })
        .eq("bill_id", bill_id);

      console.log("Bill updated successfully for payment:", finixData.id);
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
        redirect_url: `/payment-confirmation/${paymentHistory.id}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Finix transfer error:", error);
    
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