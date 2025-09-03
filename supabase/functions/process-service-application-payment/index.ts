import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Data Structures
interface ProcessServiceApplicationPaymentRequest {
  tile_id: string;
  amount_cents: number;
  payment_instrument_id: string;
  idempotency_id: string;
  fraud_session_id?: string;
  // Application data
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

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Parse request body
    const requestBody: ProcessServiceApplicationPaymentRequest = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Check for duplicate idempotency ID in payment history
    const { data: existingPayment } = await supabase
      .from('payment_history')
      .select('id')
      .eq('idempotency_id', requestBody.idempotency_id)
      .single();

    if (existingPayment) {
      return new Response(
        JSON.stringify({ error: 'Payment already processed with this idempotency ID' }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Check for duplicate in service applications to prevent double payment
    const { data: existingApplication } = await supabase
      .from('municipal_service_applications')
      .select('id, payment_status')
      .eq('idempotency_id', requestBody.idempotency_id)
      .single();

    if (existingApplication && existingApplication.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Application already paid with this idempotency ID' }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Get service tile data
    const { data: serviceTile, error: tileError } = await supabase
      .from('municipal_service_tiles')
      .select('*')
      .eq('id', requestBody.tile_id)
      .single();

    if (tileError || !serviceTile) {
      console.error('Service tile not found:', tileError);
      return new Response(
        JSON.stringify({ error: 'Service tile not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get payment instrument details
    const { data: paymentInstrument, error: instrumentError } = await supabase
      .from('user_payment_instruments')
      .select('*')
      .eq('id', requestBody.payment_instrument_id)
      .eq('user_id', user.id)
      .single();

    if (instrumentError || !paymentInstrument) {
      console.error('Payment instrument not found:', instrumentError);
      return new Response(
        JSON.stringify({ error: 'Payment instrument not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get merchant fee profile
    const { data: feeProfile, error: feeError } = await supabase
      .from('merchant_fee_profiles')
      .select('*')
      .eq('merchant_id', serviceTile.merchant_id)
      .single();

    if (feeError || !feeProfile) {
      console.error('Fee profile not found:', feeError);
      return new Response(
        JSON.stringify({ error: 'Fee profile not found for merchant' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Calculate service fee based on payment type
    const isACH = paymentInstrument.instrument_type === 'BANK_ACCOUNT';
    const calculatedServiceFee = isACH 
      ? (feeProfile.ach_fixed_fee || 0) + Math.round((requestBody.amount_cents * (feeProfile.ach_basis_points || 0)) / 10000)
      : (feeProfile.fixed_fee || 0) + Math.round((requestBody.amount_cents * (feeProfile.basis_points || 0)) / 10000);

    // Calculate total amount (backend is the single source of truth)
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
      return new Response(
        JSON.stringify({ error: 'Finix API credentials not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const FINIX_API_URL = finixEnvironment === 'live' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    // Create service application record directly
    const { data: application, error: appError } = await supabase
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
        status: 'draft',
        payment_status: 'pending',
        amount_cents: requestBody.amount_cents,
        service_fee_cents: calculatedServiceFee,
        total_amount_cents: totalAmountCents,
        payment_instrument_id: requestBody.payment_instrument_id,
        finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        merchant_id: serviceTile.merchant_id,
        finix_merchant_id: serviceTile.finix_merchant_id,
        merchant_name: serviceTile.title,
      payment_type: isACH ? 'BANK_ACCOUNT' : 'PAYMENT_CARD',
        fraud_session_id: requestBody.fraud_session_id || null,
        idempotency_id: requestBody.idempotency_id
      })
      .select()
      .single();

    if (appError || !application) {
      console.error('Failed to create service application:', appError);
      return new Response(
        JSON.stringify({ error: 'Failed to create service application' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Service application created:', application.id);

    // Create payment history record
    const { data: paymentHistory, error: phError } = await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        service_application_id: application.id,
        customer_id: serviceTile.customer_id,
        finix_payment_instrument_id: paymentInstrument.finix_payment_instrument_id,
        finix_merchant_id: serviceTile.finix_merchant_id,
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
        category: 'Municipal Services',
        subcategory: serviceTile.category || 'Other Services',
        doing_business_as: serviceTile.title,
        statement_descriptor: serviceTile.title,
        customer_first_name: requestBody.applicant_name?.split(' ')[0] || null,
        customer_last_name: requestBody.applicant_name?.split(' ').slice(1).join(' ') || null,
        customer_email: requestBody.applicant_email || null,
        customer_street_address: requestBody.street_address || null,
        customer_apt_number: requestBody.apt_number || null,
        customer_city: requestBody.city || null,
        customer_state: requestBody.state || null,
        customer_zip_code: requestBody.zip_code || null,
        business_legal_name: requestBody.business_legal_name || null,
        bill_type: 'service_application',
        issue_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        original_amount_cents: requestBody.amount_cents,
        payment_status: 'pending',
        bill_status: 'unpaid'
      })
      .select()
      .single();

    if (phError || !paymentHistory) {
      console.error('Failed to create payment history:', phError);
      // Clean up application record
      await supabase.from('municipal_service_applications').delete().eq('id', application.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Payment history created:', paymentHistory.id);

    // Process documents if provided
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

      const { error: docError } = await supabase
        .from('service_application_documents')
        .insert(documentInserts);

      if (docError) {
        console.error('Failed to create documents:', docError);
        // Continue with payment processing, documents are not critical
      } else {
        console.log('Documents created successfully');
      }
    }

    const applicationId = application.id;
    const paymentHistoryId = paymentHistory.id;

    // Now process payment with Finix
    const finixTransferPayload: FinixTransferRequest = {
      amount: totalAmountCents,
      currency: 'USD',
      merchant: serviceTile.finix_merchant_id!,
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
      console.error('Finix transfer failed:', {
        status: finixResponse.status,
        statusText: finixResponse.statusText,
        body: errorText,
      });

      // Simple rollback: Delete application and payment records
      console.log('Payment failed, cleaning up records...');
      try {
        await supabase.from('service_application_documents').delete().eq('application_id', applicationId);
        await supabase.from('payment_history').delete().eq('id', paymentHistoryId);
        await supabase.from('municipal_service_applications').delete().eq('id', applicationId);
        console.log('Cleanup successful');
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Payment processing failed',
          details: errorText
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const finixData: FinixTransferResponse = await finixResponse.json();
    console.log('Finix response:', JSON.stringify(finixData, null, 2));

    // Handle different transfer states with complete rollback on failure
    if (finixData.state === 'SUCCEEDED') {
      console.log('Payment succeeded, updating records...');
      
      // Update application and payment status for success
      const { error: appUpdateError } = await supabase
        .from('municipal_service_applications')
        .update({ 
          status: 'issued',
          payment_status: 'paid',
          payment_processed_at: new Date().toISOString(),
          finix_transfer_id: finixData.id,
          paid_at: new Date().toISOString(),
          payment_method_type: isACH ? 'BANK_ACCOUNT' : 'PAYMENT_CARD'
        })
        .eq('id', applicationId);

      if (appUpdateError) {
        console.error('Failed to update application payment status:', appUpdateError);
      } else {
        console.log('Application payment status updated successfully');
      }

      const { error: phUpdateError } = await supabase
        .from('payment_history')
        .update({ 
          payment_status: 'paid',
          transfer_state: 'SUCCEEDED',
          finix_transfer_id: finixData.id,
          payment_processed_at: new Date().toISOString()
        })
        .eq('id', paymentHistoryId);

      if (phUpdateError) {
        console.error('Failed to update payment history status:', phUpdateError);
      } else {
        console.log('Payment history status updated successfully');
      }
        
    } else if (finixData.state === 'FAILED') {
      console.error('Transfer failed:', finixData);
      const errorText = finixData.failure_message || 'Payment processing failed';
      
      // Simple rollback: Delete application and payment records  
      console.log('Payment failed, cleaning up records...');
      try {
        await supabase.from('service_application_documents').delete().eq('application_id', applicationId);
        await supabase.from('payment_history').delete().eq('id', paymentHistoryId);
        await supabase.from('municipal_service_applications').delete().eq('id', applicationId);
        console.log('Cleanup successful');
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Payment processing failed',
          details: errorText
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Service application payment processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        application_id: applicationId,
        transfer_id: finixData.id,
        status: 'issued',
        amount: totalAmountCents,
        payment_status: 'completed'
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unexpected error in service application payment:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});