import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Data Structures
interface ProcessServiceApplicationPaymentRequest {
  application_id?: string;
  tile_id: string;
  amount_cents: number;
  payment_instrument_id: string;
  idempotency_id: string;
  fraud_session_id?: string;
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
  business_legal_name?: string;
  street_address?: string;
  apt_number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  additional_information?: string;
  service_specific_data?: any;
  documents?: any[];
}

interface FinixTransferRequest {
  amount: number;
  currency: string;
  merchant: string;
  source: string;
  idempotency_id: string;
  tags?: {
    fraud_session_id?: string;
  };
}

interface FinixTransferResponse {
  id: string;
  state: string;
  amount: number;
  failure_code?: string;
  failure_message?: string;
  [key: string]: any;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Processing service application payment request: ${req.method}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase clients
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Parse request body
    const requestBody: ProcessServiceApplicationPaymentRequest = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Validate required fields
    if (!requestBody.payment_instrument_id || !requestBody.idempotency_id) {
      throw new Error('Missing required payment fields');
    }

    // Check for duplicate idempotency ID to prevent double processing
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_history')
      .select('id, finix_transfer_id, transfer_state')
      .eq('idempotency_id', requestBody.idempotency_id)
      .single();

    if (existingPayment) {
      console.log('Duplicate payment request detected:', requestBody.idempotency_id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already processed',
          payment_id: existingPayment.id,
          transfer_id: existingPayment.finix_transfer_id,
          transfer_state: existingPayment.transfer_state
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get application details and validate ownership
    let application = null;
    if (requestBody.application_id) {
      const { data: app, error: appError } = await supabaseAdmin
        .from('municipal_service_applications')
        .select('*')
        .eq('id', requestBody.application_id)
        .eq('user_id', user.id)
        .single();

      if (appError || !app) {
        throw new Error('Application not found or access denied');
      }

      if (app.status !== 'approved') {
        throw new Error('Application must be approved before payment');
      }

      if (app.payment_status === 'paid') {
        throw new Error('Application has already been paid for');
      }

      application = app;
    }

    // Get service tile data with merchant information
    const { data: serviceTile, error: tileError } = await supabaseAdmin
      .from('municipal_service_tiles')
      .select(`
        *,
        merchants!inner (
          id,
          finix_merchant_id,
          merchant_name,
          finix_identity_id
        )
      `)
      .eq('id', requestBody.tile_id)
      .single();

    if (tileError || !serviceTile) {
      throw new Error('Service tile not found');
    }

    const merchant = serviceTile.merchants;
    if (!merchant?.finix_merchant_id) {
      throw new Error('Merchant not properly configured for payments');
    }

    // Get user payment instrument and validate ownership
    const { data: paymentInstrument, error: piError } = await supabaseAdmin
      .from('user_payment_instruments')
      .select('*')
      .eq('finix_payment_instrument_id', requestBody.payment_instrument_id)
      .eq('user_id', user.id)
      .eq('enabled', true)
      .single();

    if (piError || !paymentInstrument) {
      throw new Error('Payment instrument not found or not accessible');
    }

    // Get merchant fee profile
    const { data: feeProfile, error: feeError } = await supabaseAdmin
      .from('merchant_fee_profiles')
      .select('*')
      .eq('merchant_id', merchant.id)
      .single();

    if (feeError || !feeProfile) {
      throw new Error('Fee profile not found for merchant');
    }

    // Calculate service fee based on payment type
    const isACH = paymentInstrument.instrument_type === 'BANK_ACCOUNT';
    const calculatedServiceFee = isACH 
      ? (feeProfile.ach_fixed_fee || 0) + Math.round((requestBody.amount_cents * (feeProfile.ach_basis_points || 0)) / 10000)
      : (feeProfile.fixed_fee || 0) + Math.round((requestBody.amount_cents * (feeProfile.basis_points || 0)) / 10000);

    const totalAmountCents = requestBody.amount_cents + calculatedServiceFee;
    console.log('Payment calculation:', {
      baseAmount: requestBody.amount_cents,
      serviceFee: calculatedServiceFee,
      totalAmount: totalAmountCents
    });

    // Get Finix credentials
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';

    if (!finixApplicationId || !finixApiSecret) {
      throw new Error('Finix API credentials not configured');
    }

    const FINIX_API_URL = finixEnvironment === 'live' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    // Variables for rollback tracking
    let createdApplicationId: string | null = null;
    let createdPaymentHistoryId: string | null = null;
    let finixTransferResponse: FinixTransferResponse | null = null;
    let rollbackRequired = false;

    // BEGIN ATOMIC TRANSACTION
    try {
      // Step 1: Create or update application record
      if (application) {
        // Update existing application
        const { data: updatedApp, error: updateError } = await supabaseAdmin
          .from('municipal_service_applications')
          .update({
            payment_status: 'pending',
            payment_instrument_id: requestBody.payment_instrument_id,
            finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
            payment_type: isACH ? 'BANK_ACCOUNT' : 'PAYMENT_CARD',
            fraud_session_id: requestBody.fraud_session_id || null,
            idempotency_id: requestBody.idempotency_id,
            service_fee_cents: calculatedServiceFee,
            total_amount_cents: totalAmountCents,
            updated_at: new Date().toISOString()
          })
          .eq('id', application.id)
          .select()
          .single();

        if (updateError || !updatedApp) {
          throw new Error('Failed to update application for payment');
        }

        application = updatedApp;
        console.log('Updated existing application for payment:', application.id);
      } else {
        // Create new application
        const { data: newApp, error: appError } = await supabaseAdmin
          .from('municipal_service_applications')
          .insert({
            tile_id: requestBody.tile_id,
            user_id: user.id,
            customer_id: serviceTile.customer_id,
            applicant_name: requestBody.applicant_name || null,
            applicant_email: requestBody.applicant_email || null,
            applicant_phone: requestBody.applicant_phone || null,
            business_legal_name: requestBody.business_legal_name || null,
            street_address: requestBody.street_address || null,
            apt_number: requestBody.apt_number || null,
            city: requestBody.city || null,
            state: requestBody.state || null,
            zip_code: requestBody.zip_code || null,
            additional_information: requestBody.additional_information || null,
            service_specific_data: requestBody.service_specific_data || {},
            status: 'approved',
            payment_status: 'pending',
            amount_cents: requestBody.amount_cents,
            service_fee_cents: calculatedServiceFee,
            total_amount_cents: totalAmountCents,
            payment_instrument_id: requestBody.payment_instrument_id,
            finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
            merchant_id: merchant.id,
            finix_merchant_id: merchant.finix_merchant_id,
            merchant_name: serviceTile.title,
            payment_type: isACH ? 'BANK_ACCOUNT' : 'PAYMENT_CARD',
            fraud_session_id: requestBody.fraud_session_id || null,
            idempotency_id: requestBody.idempotency_id,
            approved_at: new Date().toISOString()
          })
          .select()
          .single();

        if (appError || !newApp) {
          throw new Error('Failed to create service application');
        }

        application = newApp;
        createdApplicationId = application.id;
        console.log('Service application created:', application.id);
      }

      // Step 2: Create payment history record
      const { data: paymentHistory, error: phError } = await supabaseAdmin
        .from('payment_history')
        .insert({
          user_id: user.id,
          service_application_id: application.id,
          customer_id: serviceTile.customer_id,
          finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
          finix_merchant_id: merchant.finix_merchant_id,
          amount_cents: requestBody.amount_cents,
          service_fee_cents: calculatedServiceFee,
          total_amount_cents: totalAmountCents,
          currency: 'USD',
          payment_type: isACH ? 'BANK_ACCOUNT' : 'PAYMENT_CARD',
          idempotency_id: requestBody.idempotency_id,
          fraud_session_id: requestBody.fraud_session_id || null,
          transfer_state: 'PENDING',
          card_brand: paymentInstrument.card_brand,
          card_last_four: paymentInstrument.card_last_four,
          bank_last_four: paymentInstrument.bank_last_four,
          merchant_name: serviceTile.title,
          category: 'Administrative & Civic Fees',
          subcategory: 'Other Specialized Payments',
          statement_descriptor: serviceTile.title.substring(0, 22),
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (phError || !paymentHistory) {
        rollbackRequired = true;
        throw new Error('Failed to create payment history record');
      }

      createdPaymentHistoryId = paymentHistory.id;
      console.log('Payment history created:', paymentHistory.id);

      // Step 3: Process documents if provided
      if (requestBody.documents && requestBody.documents.length > 0) {
        const documentInserts = requestBody.documents.map(doc => ({
          application_id: application.id,
          user_id: user.id,
          customer_id: serviceTile.customer_id,
          file_name: doc.name,
          file_size: doc.size,
          content_type: doc.type,
          storage_path: doc.storage_path,
          document_type: doc.document_type || 'general',
          description: doc.description || null
        }));

        const { error: docError } = await supabaseAdmin
          .from('service_application_documents')
          .insert(documentInserts);

        if (docError) {
          console.error('Failed to create documents:', docError);
          // Continue with payment processing, documents are not critical for payment
        } else {
          console.log('Documents created successfully');
        }
      }

      // Step 4: Process payment with Finix
      const finixTransferPayload: FinixTransferRequest = {
        amount: totalAmountCents,
        currency: 'USD',
        merchant: merchant.finix_merchant_id,
        source: paymentInstrument.finix_payment_instrument_id,
        idempotency_id: requestBody.idempotency_id,
        tags: requestBody.fraud_session_id ? {
          fraud_session_id: requestBody.fraud_session_id
        } : undefined,
      };

      console.log('Creating Finix transfer with payload:', JSON.stringify(finixTransferPayload, null, 2));

      const finixResponse = await fetch(`${FINIX_API_URL}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`,
          'Finix-Version': '2022-02-01',
        },
        body: JSON.stringify(finixTransferPayload),
      });

      if (!finixResponse.ok) {
        const errorText = await finixResponse.text();
        console.error('Finix transfer failed:', errorText);
        rollbackRequired = true;
        throw new Error(`Finix payment failed: ${errorText}`);
      }

      finixTransferResponse = await finixResponse.json();
      console.log('Finix response:', JSON.stringify(finixTransferResponse, null, 2));

      if (!finixTransferResponse || finixTransferResponse.state === 'FAILED') {
        rollbackRequired = true;
        throw new Error(`Finix transfer failed: ${finixTransferResponse?.failure_message || 'Unknown error'}`);
      }

      // Step 5: Update payment history with Finix response
      const { error: updatePaymentError } = await supabaseAdmin
        .from('payment_history')
        .update({
          finix_transfer_id: finixTransferResponse.id,
          transfer_state: finixTransferResponse.state,
          payment_status: finixTransferResponse.state === 'SUCCEEDED' ? 'completed' : 'pending',
          payment_processed_at: finixTransferResponse.state === 'SUCCEEDED' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentHistory.id);

      if (updatePaymentError) {
        console.error('Failed to update payment history:', updatePaymentError);
        rollbackRequired = true;
        throw new Error('Failed to update payment status');
      }

      // Step 6: If Finix payment succeeded, update application status
      if (finixTransferResponse.state === 'SUCCEEDED') {
        console.log('Payment succeeded, updating application status...');

        const { error: updateAppError } = await supabaseAdmin
          .from('municipal_service_applications')
          .update({
            payment_status: 'paid',
            status: 'issued',
            paid_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            finix_transfer_id: finixTransferResponse.id,
            payment_method_type: isACH ? 'BANK_ACCOUNT' : 'PAYMENT_CARD',
            updated_at: new Date().toISOString()
          })
          .eq('id', application.id);

        if (updateAppError) {
          console.error('Failed to update application status:', updateAppError);
          rollbackRequired = true;
          throw new Error('Failed to update application status');
        }

        console.log('Service application payment processed successfully');
      }

      // TRANSACTION COMPLETED SUCCESSFULLY
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment processed successfully',
          payment_id: paymentHistory.id,
          application_id: application.id,
          transfer_id: finixTransferResponse.id,
          transfer_state: finixTransferResponse.state,
          amount: totalAmountCents
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);

      // ROLLBACK LOGIC
      if (rollbackRequired) {
        console.log('Starting rollback process...');

        // If we have a successful Finix payment but database operations failed,
        // initiate a refund through Finix
        if (finixTransferResponse?.id && finixTransferResponse.state === 'SUCCEEDED') {
          console.log('Initiating Finix refund due to database failure...');
          
          try {
            const refundResponse = await fetch(`${FINIX_API_URL}/transfers/${finixTransferResponse.id}/reversals`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(`${finixApplicationId}:${finixApiSecret}`)}`,
                'Finix-Version': '2022-02-01',
              },
              body: JSON.stringify({
                refund_amount: finixTransferResponse.amount
              })
            });

            if (refundResponse.ok) {
              const refundData = await refundResponse.json();
              console.log('Finix refund initiated:', refundData.id);
              
              // Update payment history to reflect the rollback
              if (createdPaymentHistoryId) {
                await supabaseAdmin
                  .from('payment_history')
                  .update({
                    payment_status: 'refunded',
                    transfer_state: 'REFUNDED',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', createdPaymentHistoryId);
              }
            } else {
              console.error('Failed to initiate Finix refund:', await refundResponse.text());
            }
          } catch (refundError) {
            console.error('Error during refund process:', refundError);
          }
        }

        // Clean up database records for failed transactions
        try {
          if (createdApplicationId) {
            await supabaseAdmin.from('service_application_documents').delete().eq('application_id', createdApplicationId);
            await supabaseAdmin.from('municipal_service_applications').delete().eq('id', createdApplicationId);
            console.log('Cleaned up application record:', createdApplicationId);
          }
          
          if (createdPaymentHistoryId) {
            await supabaseAdmin.from('payment_history').delete().eq('id', createdPaymentHistoryId);
            console.log('Cleaned up payment history record:', createdPaymentHistoryId);
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }

      throw transactionError;
    }

  } catch (error) {
    console.error('Service application payment error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        retryable: error.message.includes('network') || error.message.includes('timeout')
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});