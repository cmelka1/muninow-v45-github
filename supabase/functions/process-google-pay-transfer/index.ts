import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessGooglePayTransferRequest {
  bill_id: string;
  google_pay_token: string;
  total_amount_cents: number;
  idempotency_id: string;
  billing_address?: {
    name?: string;
    postal_code?: string;
    country?: string;
  };
  fraud_session_id?: string;
}

interface FinixPaymentInstrumentRequest {
  identity: string;
  merchant_identity: string;
  name?: string;
  third_party_token: string;
  type: "GOOGLE_PAY";
  address?: {
    country?: string;
    postal_code?: string;
  };
}

interface FinixPaymentInstrumentResponse {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
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
    const body: ProcessGooglePayTransferRequest = await req.json();
    const { 
      bill_id, 
      google_pay_token, 
      total_amount_cents, 
      idempotency_id,
      billing_address,
      fraud_session_id 
    } = body;

    console.log("Processing Google Pay transfer:", { 
      bill_id, 
      total_amount_cents, 
      user_id: user.id,
      has_billing_address: !!billing_address
    });

    // Validate input
    if (!bill_id || !google_pay_token || !total_amount_cents || !idempotency_id) {
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
      .select("*")
      .eq("bill_id", bill_id)
      .eq("user_id", user.id)
      .single();

    if (billError || !bill) {
      throw new Error("Bill not found or access denied");
    }

    console.log('Processing payment for bill:', {
      bill_id: bill.bill_id,
      amount: bill.total_amount_cents,
      merchant_id: bill.merchant_id,
      finix_merchant_id: bill.finix_merchant_id,
      merchant_finix_identity_id: bill.merchant_finix_identity_id
    });

    // Validate required merchant data for payment processing
    if (!bill.finix_merchant_id) {
      throw new Error("Merchant payment profile not configured - missing merchant ID");
    }

    if (!bill.merchant_finix_identity_id) {
      throw new Error("Merchant payment profile not configured - missing identity ID");
    }

    // Get user's Finix identity
    const { data: userIdentity, error: identityError } = await supabaseService
      .from("finix_identities")
      .select("finix_identity_id")
      .eq("user_id", user.id)
      .single();

    if (identityError || !userIdentity) {
      throw new Error("User identity not found. Please complete payment setup first.");
    }

    // Calculate service fee (same as card payment)
    const basisPoints = bill.basis_points || 250;
    const fixedFee = bill.fixed_fee || 50;
    
    const percentageFee = Math.round((bill.total_amount_cents * basisPoints) / 10000);
    const calculatedServiceFee = percentageFee + fixedFee;
    const expectedTotal = bill.total_amount_cents + calculatedServiceFee;

    // Validate total amount matches calculation
    if (Math.abs(total_amount_cents - expectedTotal) > 1) { // Allow 1 cent rounding difference
      throw new Error(`Total amount mismatch. Expected: ${expectedTotal}, Received: ${total_amount_cents}`);
    }

    // Use merchant data directly from the bill
    const finixMerchantId = bill.finix_merchant_id;
    const merchantIdentityId = bill.merchant_finix_identity_id;
    
    console.log("Merchant configuration:", { 
      finixMerchantId, 
      merchantIdentityId,
      merchantName: bill.merchant_name 
    });

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

    const finixHeaders = {
      "Content-Type": "application/json",
      "Finix-Version": "2022-02-01",
      "Authorization": `Basic ${btoa(finixApplicationId + ":" + finixApiSecret)}`
    };

    // Step 1: Create Finix Payment Instrument from Google Pay token
    const paymentInstrumentRequest: FinixPaymentInstrumentRequest = {
      identity: userIdentity.finix_identity_id,
      merchant_identity: merchantIdentityId, // Use merchant's finix_identity_id for payment instrument creation
      third_party_token: google_pay_token,
      type: "GOOGLE_PAY"
    };
    
    console.log("Creating payment instrument with:", {
      user_identity: userIdentity.finix_identity_id,
      merchant_identity: merchantIdentityId,
      has_token: !!google_pay_token
    });

    // Add billing info if available
    if (billing_address?.name) {
      paymentInstrumentRequest.name = billing_address.name;
    }

    if (billing_address?.postal_code || billing_address?.country) {
      paymentInstrumentRequest.address = {
        country: billing_address.country || "USA",
        postal_code: billing_address.postal_code
      };
    }

    console.log("Creating Finix Payment Instrument for Google Pay...");

    const piResponse = await fetch(`${finixBaseUrl}/payment_instruments`, {
      method: "POST",
      headers: finixHeaders,
      body: JSON.stringify(paymentInstrumentRequest)
    });

    const piData: FinixPaymentInstrumentResponse = await piResponse.json();

    if (!piResponse.ok || !piData.id) {
      console.error("Failed to create payment instrument:", piData);
      throw new Error(piData.message || "Failed to create payment instrument");
    }

    console.log("Payment instrument created:", piData.id);

    // Extract card details from Finix payment instrument response
    const cardBrand = piData.card?.brand || null;
    const cardLastFour = piData.card?.last_four || null;

    // Create payment history record with card details and bill information
    const { data: paymentHistory, error: phError } = await supabaseService
      .from("payment_history")
      .insert({
        user_id: user.id,
        bill_id: bill_id,
        customer_id: bill.customer_id,
        finix_payment_instrument_id: piData.id,
        finix_merchant_id: finixMerchantId,
        amount_cents: bill.total_amount_cents,
        service_fee_cents: calculatedServiceFee,
        total_amount_cents: total_amount_cents,
        currency: 'USD',
        payment_type: 'GOOGLE_PAY',
        idempotency_id: idempotency_id,
        fraud_session_id: fraud_session_id,
        transfer_state: 'PENDING',
        card_brand: cardBrand,
        card_last_four: cardLastFour,
        bank_last_four: null,
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

    // Step 2: Create Finix Transfer using the payment instrument
    const finixRequest: FinixTransferRequest = {
      merchant: finixMerchantId,
      currency: "USD",
      amount: total_amount_cents,
      source: piData.id,
      idempotency_id: idempotency_id
    };

    if (fraud_session_id) {
      finixRequest.fraud_session_id = fraud_session_id;
    }

    console.log("Creating Finix Transfer...");

    const transferResponse = await fetch(`${finixBaseUrl}/transfers`, {
      method: "POST",
      headers: finixHeaders,
      body: JSON.stringify(finixRequest)
    });

    const transferData: FinixTransferResponse = await transferResponse.json();

    console.log("Finix transfer response:", { 
      status: transferResponse.status, 
      transfer_id: transferData.id,
      state: transferData.state 
    });

    // Update payment history with Finix response
    const updateData: any = {
      raw_finix_response: {
        payment_instrument: piData,
        transfer: transferData
      },
      updated_at: new Date().toISOString()
    };

    if (transferResponse.ok && transferData.id) {
      updateData.finix_transfer_id = transferData.id;
      updateData.transfer_state = transferData.state || 'PENDING';
      updateData.finix_created_at = transferData.created_at;
      updateData.finix_updated_at = transferData.updated_at;
    } else {
      updateData.transfer_state = 'FAILED';
      updateData.failure_code = transferData.failure_code || 'API_ERROR';
      updateData.failure_message = transferData.failure_message || 'Finix API request failed';
    }

    await supabaseService
      .from("payment_history")
      .update(updateData)
      .eq("id", paymentHistory.id);

    // If transfer succeeded, update the bill
    if (transferResponse.ok && transferData.state === 'SUCCEEDED') {
      const newPaidAmount = (bill.total_paid_cents || 0) + total_amount_cents;
      const newRemainingBalance = bill.total_amount_cents - newPaidAmount;
      
      await supabaseService
        .from("master_bills")
        .update({
          calculated_fee_cents: calculatedServiceFee,
          total_paid_cents: newPaidAmount,
          remaining_balance_cents: Math.max(0, newRemainingBalance),
          payment_status: newRemainingBalance <= 0 ? 'paid' : 'unpaid',
          external_payment_reference: transferData.id,
          payment_processed_by: 'finix_google_pay',
          updated_at: new Date().toISOString()
        })
        .eq("bill_id", bill_id);

      console.log("Bill updated successfully for Google Pay payment:", transferData.id);
    }

    // Return response
    if (!transferResponse.ok) {
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
        transfer_id: transferData.id,
        transfer_state: transferData.state,
        amount_cents: total_amount_cents,
        redirect_url: `/payment-confirmation/${paymentHistory.id}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Google Pay transfer error:", error);
    
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