import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessTaxPaymentRequest {
  tax_type: string;
  tax_period_start: string;
  tax_period_end: string;
  tax_year: number;
  customer_id: string;
  merchant_id: string;
  payment_instrument_id: string;
  base_amount_cents: number; // Original tax amount (base)
  service_fee_cents: number; // Calculated service fee
  total_amount_cents: number; // Grossed-up total
  idempotency_id: string;
  fraud_session_id: string;
  calculation_notes: string;
  payer_first_name: string;
  payer_last_name: string;
  payer_email: string;
  payer_ein?: string;
  payer_phone?: string;
  payer_business_name?: string;
  payer_street_address: string;
  payer_city: string;
  payer_state: string;
  payer_zip_code: string;
  staging_id?: string; // For confirming staged documents
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
    const body: ProcessTaxPaymentRequest = await req.json();
    const { 
      tax_type,
      tax_period_start,
      tax_period_end,
      tax_year,
      customer_id,
      merchant_id,
      payment_instrument_id,
      base_amount_cents,
      service_fee_cents,
      total_amount_cents,
      idempotency_id,
      fraud_session_id,
      calculation_notes,
      payer_first_name,
      payer_last_name,
      payer_email,
      payer_ein,
      payer_phone,
      payer_business_name,
      payer_street_address,
      payer_city,
      payer_state,
      payer_zip_code,
      staging_id
    } = body;

    console.log("Processing tax payment:", { 
      tax_type, 
      payment_instrument_id, 
      base_amount_cents,
      service_fee_cents,
      total_amount_cents, 
      user_id: user.id 
    });

    // Validate required input parameters
    const missingParams = [];
    if (!tax_type) missingParams.push("tax_type");
    if (!payment_instrument_id) missingParams.push("payment_instrument_id");
    if (!base_amount_cents) missingParams.push("base_amount_cents");
    if (!service_fee_cents && service_fee_cents !== 0) missingParams.push("service_fee_cents");
    if (!total_amount_cents) missingParams.push("total_amount_cents");
    if (!idempotency_id) missingParams.push("idempotency_id");
    
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(", ")}`);
    }

    // Validate amounts are reasonable
    if (base_amount_cents <= 0) {
      throw new Error("Base amount must be greater than zero");
    }
    
    if (total_amount_cents <= 0) {
      throw new Error("Total amount must be greater than zero");
    }
    
    // Validate that total = base + service fee (with small rounding tolerance)
    if (Math.abs((base_amount_cents + service_fee_cents) - total_amount_cents) > 1) {
      throw new Error(`Amount calculation error: base (${base_amount_cents}) + fee (${service_fee_cents}) != total (${total_amount_cents})`);
    }

    // fraud_session_id is optional - if empty, we'll still proceed but log a warning
    if (!fraud_session_id || fraud_session_id.trim() === '') {
      console.warn("No fraud session ID provided for tax payment");
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

    // Get merchant details using the provided merchant_id as the Finix merchant ID
    const { data: merchant, error: merchantError } = await supabaseService
      .from("merchants")
      .select("*")
      .eq("finix_merchant_id", merchant_id)
      .single();

    if (merchantError || !merchant) {
      throw new Error("Merchant not found or not configured for payments");
    }

    // merchant_id from the request should be the finix_merchant_id
    const finixMerchantId = merchant_id;

    // Use the provided amounts from frontend (no reverse calculation needed)
    const baseAmount = base_amount_cents;
    const calculatedServiceFee = service_fee_cents;
    
    // Validate payment instrument type matches expected fee calculation
    const isCard = paymentInstrument.instrument_type === 'PAYMENT_CARD';
    const expectedBasisPoints = isCard ? 300 : 150; // 3% for cards, 1.5% for ACH
    const expectedFixedFee = 50; // $0.50 fixed fee for both
    
    // Validate that the service fee calculation is reasonable
    const expectedPercentageFee = Math.round((baseAmount * expectedBasisPoints) / 10000);
    const expectedTotalFee = expectedPercentageFee + expectedFixedFee;
    
    // Allow some tolerance for rounding differences in grossed-up calculations
    if (Math.abs(calculatedServiceFee - expectedTotalFee) > 2) {
      console.warn(`Service fee mismatch - Expected: ${expectedTotalFee}, Received: ${calculatedServiceFee}`);
    }

    console.log("Fee calculation:", { 
      baseAmount, 
      serviceFee: calculatedServiceFee, 
      totalAmount: total_amount_cents, 
      expectedBasisPoints, 
      expectedFixedFee 
    });

    // Determine payment type
    const paymentType = paymentInstrument.instrument_type === 'PAYMENT_CARD' ? 'Card' : 'Bank Account';

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

    console.log("Calling Finix API before creating database records");

    // Create Finix transfer FIRST - only proceed if successful
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

    // If Finix failed, return error immediately without creating database records
    if (!finixResponse.ok) {
      const errorMessage = finixData.failure_message || `Finix API error: ${finixResponse.status}`;
      console.error("Finix transfer failed:", errorMessage);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          finix_error_code: finixData.failure_code,
          finix_response: finixData
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("Finix transfer successful, creating database records");

    // Only create database records after Finix success
    let taxSubmission, paymentHistory;

    try {
      // Create tax submission record
      const { data: tsData, error: tsError } = await supabaseService
        .from("tax_submissions")
        .insert({
          user_id: user.id,
          customer_id: customer_id,
          merchant_id: merchant.id,
          tax_type: tax_type,
          tax_period_start: tax_period_start,
          tax_period_end: tax_period_end,
          tax_year: tax_year,
          amount_cents: baseAmount,
          calculation_notes: calculation_notes,
          total_amount_due_cents: baseAmount,
          total_amount_cents: total_amount_cents,
          service_fee_cents: calculatedServiceFee,
          finix_merchant_id: finixMerchantId,
          merchant_name: merchant.merchant_name,
          category: merchant.category,
          subcategory: merchant.subcategory,
          statement_descriptor: merchant.statement_descriptor,
          submission_status: 'submitted',
          payment_status: 'paid',
          transfer_state: finixData.state || 'SUCCEEDED',
          finix_transfer_id: finixData.id,
          paid_at: new Date().toISOString(),
          submission_date: new Date().toISOString(),
          idempotency_id: idempotency_id,
          fraud_session_id: fraud_session_id,
          payment_type: paymentType,
          first_name: payer_first_name,
          last_name: payer_last_name,
          email: payer_email,
          payer_ein: payer_ein,
          payer_phone: payer_phone,
          payer_street_address: payer_street_address,
          payer_city: payer_city,
          payer_state: payer_state,
          payer_zip_code: payer_zip_code,
          payer_business_name: payer_business_name
        })
        .select()
        .single();

      if (tsError) {
        console.error("Error creating tax submission after successful Finix transfer:", tsError);
        throw new Error("Failed to create tax submission record");
      }

      taxSubmission = tsData;

      // Create payment history record
      const { data: phData, error: phError } = await supabaseService
        .from("payment_history")
        .insert({
          user_id: user.id,
          customer_id: customer_id,
          tax_submission_id: taxSubmission.id,
          finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
          finix_merchant_id: finixMerchantId,
          finix_transfer_id: finixData.id,
          amount_cents: baseAmount,
          service_fee_cents: calculatedServiceFee,
          total_amount_cents: total_amount_cents,
          currency: 'USD',
          payment_type: paymentType,
          idempotency_id: idempotency_id,
          fraud_session_id: fraud_session_id,
          transfer_state: finixData.state || 'SUCCEEDED',
          card_brand: paymentInstrument.card_brand,
          card_last_four: paymentInstrument.card_last_four,
          bank_last_four: paymentInstrument.bank_last_four,
          merchant_id: merchant.id,
          merchant_name: merchant.merchant_name,
          category: merchant.category,
          subcategory: merchant.subcategory,
          statement_descriptor: merchant.statement_descriptor,
          // Customer information
          customer_first_name: payer_first_name,
          customer_last_name: payer_last_name,
          customer_email: payer_email,
          customer_street_address: payer_street_address,
          customer_city: payer_city,
          customer_state: payer_state,
          customer_zip_code: payer_zip_code,
          // Tax-specific information
          bill_type: 'tax',
          payment_status: 'paid',
          bill_status: 'paid',
          payment_instrument_id: payment_instrument_id,
          raw_finix_response: finixData,
          finix_created_at: finixData.created_at,
          finix_updated_at: finixData.updated_at
        })
        .select()
        .single();

      if (phError) {
        console.error("Error creating payment history after successful Finix transfer:", phError);
        // Cleanup tax submission since payment history failed
        await supabaseService.from("tax_submissions").delete().eq("id", taxSubmission.id);
        throw new Error("Failed to create payment record");
      }

      paymentHistory = phData;

      console.log("Successfully created all database records for payment:", finixData.id);

      // Confirm staged documents if staging_id is provided
      if (staging_id) {
        console.log("Confirming staged documents for staging_id:", staging_id);
        try {
          // First check if staged documents exist
          const { data: stagedDocs, error: checkError } = await supabaseService
            .from('tax_submission_documents')
            .select('id, status')
            .eq('staging_id', staging_id)
            .eq('status', 'staged');
          
          if (checkError) {
            console.error("Error checking staged documents:", checkError);
          } else if (!stagedDocs || stagedDocs.length === 0) {
            console.log("No staged documents found for staging_id:", staging_id);
          } else {
            console.log(`Found ${stagedDocs.length} staged documents to confirm`);
            
            const { error: confirmError } = await supabaseService.rpc('confirm_staged_tax_documents', {
              p_staging_id: staging_id,
              p_tax_submission_id: taxSubmission.id
            });
            
            if (confirmError) {
              console.error("Error confirming staged documents:", confirmError);
              // Retry once after a brief delay
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { error: retryError } = await supabaseService.rpc('confirm_staged_tax_documents', {
                p_staging_id: staging_id,
                p_tax_submission_id: taxSubmission.id
              });
              
              if (retryError) {
                console.error("Retry also failed:", retryError);
              } else {
                console.log("Successfully confirmed staged documents on retry");
              }
            } else {
              console.log("Successfully confirmed staged documents");
            }
          }
        } catch (docError) {
          console.error("Failed to confirm staged documents:", docError);
          // Don't fail the payment for document confirmation issues
        }
      }

    } catch (dbError) {
      console.error("Database operation failed after successful Finix transfer:", dbError);
      
      // Cleanup staged documents on payment failure
      if (staging_id) {
        try {
          await supabaseService.rpc('cleanup_staged_tax_documents', {
            p_staging_id: staging_id
          });
          console.log("Cleaned up staged documents after payment failure");
        } catch (cleanupError) {
          console.error("Failed to cleanup staged documents:", cleanupError);
        }
      }
      
      // Return error indicating payment succeeded but database failed
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment processed successfully but database recording failed. Please contact support.",
          transfer_id: finixData.id,
          finix_state: finixData.state,
          internal_error: dbError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_history_id: paymentHistory.id,
        tax_submission_id: taxSubmission.id,
        transfer_id: finixData.id,
        transfer_state: finixData.state,
        amount_cents: total_amount_cents,
        redirect_url: `/taxes`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Tax payment error:", error);
    
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