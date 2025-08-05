import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessPermitApplePayTransferRequest {
  permit_id: string;
  apple_pay_token: string;
  total_amount_cents: number;
  idempotency_id: string;
  billing_contact?: {
    givenName?: string;
    familyName?: string;
    postalCode?: string;
    countryCode?: string;
  };
  fraud_session_id?: string;
}

interface FinixPaymentInstrumentRequest {
  identity: string;
  merchant_identity: string;
  name?: string;
  third_party_token: string;
  type: "APPLE_PAY";
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
    const body: ProcessPermitApplePayTransferRequest = await req.json();
    const { 
      permit_id, 
      apple_pay_token, 
      total_amount_cents, 
      idempotency_id,
      billing_contact,
      fraud_session_id 
    } = body;

    console.log("Processing Apple Pay permit payment:", { 
      permit_id, 
      total_amount_cents, 
      user_id: user.id,
      has_billing_contact: !!billing_contact
    });

    // Validate input
    if (!permit_id || !apple_pay_token || !total_amount_cents || !idempotency_id) {
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
      .select(`
        *,
        municipal_permit_merchants!inner(
          merchant_id,
          permit_merchant_name,
          merchants!inner(finix_merchant_id, merchant_name, finix_identity_id, basis_points, fixed_fee)
        )
      `)
      .eq("permit_id", permit_id)
      .eq("user_id", user.id)
      .eq("application_status", "approved")
      .single();

    if (permitError || !permit) {
      throw new Error("Permit not found, access denied, or not approved for payment");
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
    const merchant = permit.municipal_permit_merchants?.merchants;
    const basisPoints = merchant?.basis_points || 250;
    const fixedFee = merchant?.fixed_fee || 50;
    
    const baseAmount = permit.payment_amount_cents || permit.total_amount_cents || 0;
    const percentageFee = Math.round((baseAmount * basisPoints) / 10000);
    const calculatedServiceFee = percentageFee + fixedFee;
    const expectedTotal = baseAmount + calculatedServiceFee;

    // Validate total amount matches calculation
    if (Math.abs(total_amount_cents - expectedTotal) > 1) { // Allow 1 cent rounding difference
      throw new Error(`Total amount mismatch. Expected: ${expectedTotal}, Received: ${total_amount_cents}`);
    }

    // Get Finix merchant ID from the permit's merchant
    const finixMerchantId = merchant?.finix_merchant_id;
    const merchantIdentityId = merchant?.finix_identity_id;
    
    console.log("Merchant configuration:", { 
      finixMerchantId, 
      merchantIdentityId,
      merchantName: merchant?.merchant_name 
    });
    
    if (!finixMerchantId || !merchantIdentityId) {
      throw new Error("Merchant not configured with Finix");
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

    const finixHeaders = {
      "Content-Type": "application/json",
      "Finix-Version": "2022-02-01",
      "Authorization": `Basic ${btoa(finixApplicationId + ":" + finixApiSecret)}`
    };

    // Step 1: Create Finix Payment Instrument from Apple Pay token
    const paymentInstrumentRequest: FinixPaymentInstrumentRequest = {
      identity: userIdentity.finix_identity_id,
      merchant_identity: finixMerchantId,
      third_party_token: apple_pay_token,
      type: "APPLE_PAY"
    };
    
    console.log("Creating payment instrument with:", {
      user_identity: userIdentity.finix_identity_id,
      merchant_identity: finixMerchantId,
      has_token: !!apple_pay_token
    });

    // Add billing info if available
    if (billing_contact?.givenName && billing_contact?.familyName) {
      paymentInstrumentRequest.name = `${billing_contact.givenName} ${billing_contact.familyName}`;
    }

    if (billing_contact?.postalCode || billing_contact?.countryCode) {
      paymentInstrumentRequest.address = {
        country: billing_contact.countryCode || "US",
        postal_code: billing_contact.postalCode
      };
    }

    console.log("Creating Finix Payment Instrument for Apple Pay...");

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
        finix_payment_instrument_id: piData.id,
        finix_merchant_id: finixMerchantId,
        amount_cents: baseAmount,
        service_fee_cents: calculatedServiceFee,
        total_amount_cents: total_amount_cents,
        currency: 'USD',
        payment_type: 'Apple Pay',
        idempotency_id: idempotency_id,
        fraud_session_id: fraud_session_id,
        transfer_state: 'PENDING',
        card_brand: cardBrand,
        card_last_four: cardLastFour,
        bank_last_four: null,
        // Merchant Information
        merchant_name: merchant?.merchant_name || permit.municipal_permit_merchants?.permit_merchant_name,
        category: 'Property-Related',
        subcategory: 'Building Permits',
        doing_business_as: permit.municipal_permit_merchants?.permit_merchant_name,
        statement_descriptor: permit.municipal_permit_merchants?.permit_merchant_name,
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
        due_date: permit.created_at,
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

    // If transfer succeeded, update the permit
    if (transferResponse.ok && transferData.state === 'SUCCEEDED') {
      try {
        const { error: permitUpdateError } = await supabaseService
          .from("permit_applications")
          .update({
            service_fee_cents: calculatedServiceFee,
            total_amount_cents: total_amount_cents,
            payment_status: 'paid',
            application_status: 'issued',
            finix_transfer_id: transferData.id,
            payment_processed_at: new Date().toISOString(),
            payment_method_type: 'Apple Pay',
            updated_at: new Date().toISOString()
          })
          .eq("permit_id", permit_id);

        if (permitUpdateError) {
          console.error("Error updating permit:", permitUpdateError);
          throw new Error("Failed to update permit status");
        }

        console.log("Permit updated successfully for Apple Pay payment:", transferData.id);
      } catch (error) {
        console.error("Permit update failed:", error);
        // Note: Payment was successful, but permit update failed
        // This should be handled by manual review
      }
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
        redirect_url: `/permit/${permit_id}?payment=success`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Apple Pay permit payment error:", error);
    
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