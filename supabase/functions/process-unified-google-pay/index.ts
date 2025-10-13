import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { 
  classifyPaymentError, 
  generateIdempotencyId, 
  generateDeterministicUUID,
  generateIdempotencyMetadata 
} from '../shared/paymentUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BillingAddress {
  name?: string;
  postal_code?: string;
  country_code?: string;
  address1?: string;
  address2?: string;
  locality?: string;
  administrative_area?: string;
}

interface UnifiedGooglePayRequest {
  entity_type: 'permit' | 'tax_submission' | 'business_license' | 'service_application';
  entity_id: string;
  customer_id: string;
  merchant_id: string;
  base_amount_cents: number;
  google_pay_token: string;
  billing_address?: BillingAddress;
  fraud_session_id?: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
  idempotency_id?: string; // Optional client-provided idempotency ID
}

interface UnifiedGooglePayResponse {
  success: boolean;
  transaction_id?: string;
  finix_transfer_id?: string;
  finix_payment_instrument_id?: string;
  service_fee_cents?: number;
  total_amount_cents?: number;
  error?: string;
  retryable?: boolean;
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
  card?: {
    brand?: string;
    last_four?: string;
  };
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

Deno.serve(async (req) => {
  console.log('=== UNIFIED GOOGLE PAY REQUEST ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const body: UnifiedGooglePayRequest = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const {
      entity_type,
      entity_id,
      customer_id,
      merchant_id,
      base_amount_cents,
      google_pay_token,
      billing_address,
      fraud_session_id,
      first_name,
      last_name,
      user_email,
      idempotency_id: clientIdempotencyId
    } = body;

    // Validate required fields
    if (!entity_type || !entity_id || !customer_id || !merchant_id || !base_amount_cents || !google_pay_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate entity type
    const supportedEntityTypes = ['permit', 'tax_submission', 'business_license', 'service_application'];
    if (!supportedEntityTypes.includes(entity_type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unsupported entity type: ${entity_type}. Supported types: ${supportedEntityTypes.join(', ')}`,
          retryable: false
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user from auth token
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized', retryable: false }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('Authenticated user:', user.id);

    // Get merchant information and fee profile
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('finix_merchant_id, finix_identity_id, merchant_name, category, subcategory, statement_descriptor')
      .eq('id', merchant_id)
      .single();

    // Get merchant fee profile for ACH fee limit support
    const { data: feeProfile, error: feeError } = await supabase
      .from('merchant_fee_profiles')
      .select('ach_basis_points_fee_limit, basis_points, fixed_fee, ach_basis_points, ach_fixed_fee')
      .eq('merchant_id', merchant_id)
      .single();

    if (feeError && feeError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn('Failed to fetch merchant fee profile:', feeError);
    }

    console.log('Fee profile for merchant:', feeProfile);

    if (merchantError || !merchant) {
      console.error('Merchant fetch error:', merchantError);
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found', retryable: false }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!merchant.finix_merchant_id || !merchant.finix_identity_id) {
      console.error('Merchant missing Finix IDs');
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not properly configured', retryable: false }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Entity validation based on type
    let entityData: any = null;
    
    if (entity_type === 'permit') {
      const { data: permit, error: permitError } = await supabase
        .from('permit_applications')
        .select('*')
        .eq('permit_id', entity_id)
        .eq('user_id', user.id)
        .single();

      if (permitError || !permit) {
        console.error('Permit fetch error:', permitError);
        return new Response(
          JSON.stringify({ success: false, error: 'Permit not found or access denied', retryable: false }),
          { status: 404, headers: corsHeaders }
        );
      }

      if (permit.application_status !== 'approved') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Permit must be approved before payment can be processed',
            retryable: false
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      entityData = permit;
      
    } else if (entity_type === 'tax_submission') {
      const { data: taxSubmission, error: taxError } = await supabase
        .from('tax_submissions')
        .select('*')
        .eq('id', entity_id)
        .eq('user_id', user.id)
        .single();

      if (taxError || !taxSubmission) {
        console.error('Tax submission fetch error:', taxError);
        return new Response(
          JSON.stringify({ success: false, error: 'Tax submission not found or access denied', retryable: false }),
          { status: 404, headers: corsHeaders }
        );
      }

      if (taxSubmission.payment_status === 'paid') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Tax submission has already been paid',
            retryable: false
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      entityData = taxSubmission;
      
    } else if (entity_type === 'business_license') {
      const { data: businessLicense, error: licenseError } = await supabase
        .from('business_license_applications')
        .select('*')
        .eq('id', entity_id)
        .eq('user_id', user.id)
        .single();

      if (licenseError || !businessLicense) {
        console.error('Business license fetch error:', licenseError);
        return new Response(
          JSON.stringify({ success: false, error: 'Business license not found or access denied', retryable: false }),
          { status: 404, headers: corsHeaders }
        );
      }

      if (businessLicense.application_status !== 'approved') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Business license must be approved before payment can be processed',
            retryable: false
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      entityData = businessLicense;
      
    } else if (entity_type === 'service_application') {
      const { data: serviceApplication, error: serviceError } = await supabase
        .from('municipal_service_applications')
        .select('*')
        .eq('id', entity_id)
        .eq('user_id', user.id)
        .single();

      if (serviceError || !serviceApplication) {
        console.error('Service application fetch error:', serviceError);
        return new Response(
          JSON.stringify({ success: false, error: 'Service application not found or access denied', retryable: false }),
          { status: 404, headers: corsHeaders }
        );
      }

      if (serviceApplication.status !== 'approved') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Service application must be approved before payment can be processed',
            retryable: false
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      entityData = serviceApplication;
    }

    // Get user's Finix identity
    const { data: userIdentity, error: identityError } = await supabase
      .from('finix_identities')
      .select('finix_identity_id')
      .eq('user_id', user.id)
      .single();

    if (identityError || !userIdentity) {
      console.error('User identity fetch error:', identityError);
      return new Response(
        JSON.stringify({ success: false, error: 'User identity not found. Please complete payment setup first.', retryable: false }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Extract unique session ID from fraud_session_id
    const sessionIdForUuid = fraud_session_id || `gpay_${entity_id}_${Date.now()}`;

    // Generate deterministic UUID for idempotency
    // Entity-specific payment instrument ID ensures unique UUIDs per entity
    const idempotencyUuid = generateDeterministicUUID({
      entityType: entity_type,
      entityId: entity_id,
      userId: user.id,
      sessionId: sessionIdForUuid,
      baseAmountCents: base_amount_cents,
      paymentInstrumentId: `gpay-${entity_id}-${google_pay_token.substring(0, 10)}` // ✅ Entity-specific
    });
    
    console.log('🔑 UUID generation inputs:', {
      entityType: entity_type,
      entityId: entity_id,
      userId: user.id,
      sessionId: sessionIdForUuid,
      paymentInstrumentId: `gpay-${entity_id}-${google_pay_token.substring(0, 10)}`
    });
    console.log('Generated idempotency UUID:', idempotencyUuid);
    
    // Generate comprehensive metadata for debugging
    const metadata = generateIdempotencyMetadata({
      sessionId: sessionIdForUuid,
      entityType: entity_type,
      entityId: entity_id,
      userId: user.id,
      paymentMethod: 'google-pay',
      paymentInstrumentId: 'google-pay-token',
      clientUserAgent: req.headers.get('user-agent') || 'unknown',
      clientIp: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
    });
    
    console.log('Idempotency metadata:', metadata);

    // Check for existing payment transaction with this UUID
    console.log('Checking for duplicate payment with UUID:', idempotencyUuid);
    const { data: existingTransaction, error: existingError } = await supabase
      .from('payment_transactions')
      .select('id, payment_status, finix_transfer_id, finix_payment_instrument_id, service_fee_cents, total_amount_cents, idempotency_metadata')
      .eq('idempotency_uuid', idempotencyUuid)
      .maybeSingle();

    if (existingTransaction && !existingError) {
      console.log('Found existing transaction with idempotency ID:', existingTransaction);
      
      // If payment is already completed, return the existing result
      if (['paid', 'completed'].includes(existingTransaction.payment_status)) {
        console.log('Returning existing successful Google Pay payment result');
        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: existingTransaction.id,
            finix_transfer_id: existingTransaction.finix_transfer_id,
            finix_payment_instrument_id: existingTransaction.finix_payment_instrument_id,
            service_fee_cents: existingTransaction.service_fee_cents,
            total_amount_cents: existingTransaction.total_amount_cents,
            duplicate_prevented: true
          }),
          { status: 200, headers: corsHeaders }
        );
      }
      
      // If payment is still pending, return error to prevent duplicate attempts
      if (existingTransaction.payment_status === 'pending') {
        console.log('Found pending Google Pay payment with same idempotency ID');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Google Pay payment with this identifier is already being processed',
            retryable: false
          }),
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // STEP 1: Create payment transaction record FIRST (atomic approach)
    console.log('=== CREATING PAYMENT TRANSACTION RECORD ===');
    
    const { data: feeCalcResult, error: feeCalcError } = await supabase.rpc(
      'create_unified_payment_transaction',
      {
        p_user_id: user.id,
        p_customer_id: customer_id,
        p_merchant_id: merchant_id,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_base_amount_cents: base_amount_cents,
        p_payment_instrument_id: '', // Will be set after creating Finix payment instrument
        p_payment_type: 'google-pay',
        p_fraud_session_id: fraud_session_id || null,
        p_idempotency_uuid: idempotencyUuid,
        p_idempotency_metadata: metadata,
        p_is_card: true, // Google Pay is treated as card payment (uses card fee rates & no ACH fee limit)
        p_card_brand: null, // Will be updated after payment instrument creation
        p_card_last_four: null,
        p_bank_last_four: null,
        p_first_name: first_name || null,
        p_last_name: last_name || null,
        p_user_email: user_email || user.email || null
      }
    );

    if (feeCalcError || !feeCalcResult?.success) {
      console.error('Fee calculation error:', feeCalcError, feeCalcResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: feeCalcResult?.error || 'Failed to calculate fees',
          retryable: true
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const serviceFeeFromDB = feeCalcResult.service_fee_cents;
    const totalAmountFromDB = feeCalcResult.total_amount_cents;
    const transactionId = feeCalcResult.transaction_id;

    console.log('Database fee calculation:', {
      service_fee: serviceFeeFromDB,
      total_amount: totalAmountFromDB,
      transaction_id: transactionId
    });

    // STEP 2: Initialize Finix API
    console.log('=== INITIALIZING FINIX API ===');
    
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    if (!finixApplicationId || !finixApiSecret) {
      // ROLLBACK: Delete the payment transaction record
      await supabase
        .from('payment_transactions')
        .delete()
        .eq('id', transactionId);
        
      return new Response(
        JSON.stringify({ success: false, error: 'Finix credentials not configured', retryable: false }),
        { status: 500, headers: corsHeaders }
      );
    }

    const finixApiUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixCredentials = btoa(`${finixApplicationId}:${finixApiSecret}`);
    const finixHeaders = {
      'Authorization': `Basic ${finixCredentials}`,
      'Content-Type': 'application/json',
      'Finix-Version': '2022-02-01'
    };

    // STEP 3: Create Finix Payment Instrument from Google Pay token
    console.log('=== CREATING FINIX PAYMENT INSTRUMENT ===');
    
    const paymentInstrumentRequest: FinixPaymentInstrumentRequest = {
      identity: userIdentity.finix_identity_id,
      merchant_identity: merchant.finix_merchant_id,
      third_party_token: google_pay_token,
      type: "GOOGLE_PAY"
    };
    
    // Add billing info if available
    if (billing_address?.name) {
      paymentInstrumentRequest.name = billing_address.name;
    }

    if (billing_address?.postal_code || billing_address?.country_code) {
      paymentInstrumentRequest.address = {
        country: billing_address.country_code || "USA",
        postal_code: billing_address.postal_code
      };
    }

    console.log('Creating Finix Payment Instrument:', {
      user_identity: userIdentity.finix_identity_id,
      merchant_identity: merchant.finix_identity_id,
      has_token: !!google_pay_token
    });

    const piResponse = await fetch(`${finixApiUrl}/payment_instruments`, {
      method: 'POST',
      headers: finixHeaders,
      body: JSON.stringify(paymentInstrumentRequest)
    });

    const piData: FinixPaymentInstrumentResponse = await piResponse.json();
    console.log('Finix payment instrument response:', JSON.stringify(piData, null, 2));

    if (!piResponse.ok || !piData.id) {
      console.error('Failed to create payment instrument:', piData);
      
      // ROLLBACK: Delete the payment transaction record since Finix failed
      console.log('Rolling back payment transaction record:', transactionId);
      await supabase
        .from('payment_transactions')
        .delete()
        .eq('id', transactionId);
      
      const classifiedError = classifyPaymentError(piData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: classifiedError.message,
          retryable: classifiedError.retryable,
          error_type: classifiedError.type
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Payment instrument created successfully:', piData.id);

    // Extract card details from Finix payment instrument response
    const cardBrand = piData.card?.brand || null;
    const cardLastFour = piData.card?.last_four || null;

    // Update payment transaction with payment instrument details
    await supabase
      .from('payment_transactions')
      .update({
        finix_payment_instrument_id: piData.id,
        card_brand: cardBrand,
        card_last_four: cardLastFour
      })
      .eq('id', transactionId);

    // STEP 4: Create Finix Transfer using the payment instrument
    console.log('=== CREATING FINIX TRANSFER ===');
    
    const transferPayload: FinixTransferRequest = {
      merchant: merchant.finix_merchant_id,
      currency: 'USD',
      amount: totalAmountFromDB,
      source: piData.id,
      idempotency_id: idempotencyUuid
    };

    if (fraud_session_id) {
      transferPayload.fraud_session_id = fraud_session_id;
    }

    console.log('Creating Finix transfer:', transferPayload);

    const finixResponse = await fetch(`${finixApiUrl}/transfers`, {
      method: 'POST',
      headers: finixHeaders,
      body: JSON.stringify(transferPayload)
    });

    const finixData: FinixTransferResponse = await finixResponse.json();
    console.log('Finix API response:', JSON.stringify(finixData, null, 2));

    if (!finixResponse.ok) {
      console.error('Finix transfer failed:', finixData);
      
      // ROLLBACK: Delete the payment transaction record since Finix failed
      console.log('Rolling back payment transaction record:', transactionId);
      await supabase
        .from('payment_transactions')
        .delete()
        .eq('id', transactionId);
      
      // Classify the error for appropriate handling
      const classifiedError = classifyPaymentError(finixData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: classifiedError.message,
          retryable: classifiedError.retryable,
          error_type: classifiedError.type
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Finix transfer created successfully:', finixData);

    // STEP 5: Update payment record with success details and entity status atomically
    console.log('=== UPDATING PAYMENT STATUS AND ENTITY ===');
    
    const finalPaymentStatus = finixData.state === 'SUCCEEDED' ? 'paid' : 'unpaid';
    
    // Update payment transaction with Finix results
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        payment_status: finalPaymentStatus,
        transfer_state: finixData.state,
        finix_transfer_id: finixData.id,
        raw_finix_response: finixData
      })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      // Continue anyway - the payment went through
    }

    // STEP 6: Update entity status if payment succeeded
    if (finixData.state === 'SUCCEEDED') {
      console.log(`=== UPDATING ${entity_type.toUpperCase()} STATUS ===`);
      console.log(`   Entity ID: ${entity_id}`);
      console.log(`   Total Amount from DB: ${totalAmountFromDB}`);
      
      try {
        if (entity_type === 'permit') {
          const permitUpdate: any = {
            payment_status: 'paid',
            payment_processed_at: new Date().toISOString(),
            finix_transfer_id: finixData.id,
            transfer_state: 'SUCCEEDED',
            application_status: 'issued',
            issued_at: new Date().toISOString()
          };
          
          const { error: permitUpdateError } = await supabase
            .from('permit_applications')
            .update(permitUpdate)
            .eq('permit_id', entity_id);
            
          if (permitUpdateError) {
            console.error('Failed to update permit status:', permitUpdateError);
            throw permitUpdateError;
          }
          console.log('Successfully updated permit status to issued after Google Pay payment');
          
        } else if (entity_type === 'tax_submission') {
          // Update tax submission with complete payment data
          const taxUpdate = {
            payment_status: 'paid',
            submission_status: 'issued',
            transfer_state: finixData.state || 'SUCCEEDED',
            finix_transfer_id: finixData.id,
            service_fee_cents: serviceFeeFromDB,
            total_amount_due_cents: totalAmountFromDB,
            payment_processed_at: new Date().toISOString(),
            filed_at: new Date().toISOString(),
            payment_type: 'google-pay',
            payment_instrument_id: piData.id,
            // Add missing Finix and merchant data
            finix_merchant_id: merchant.finix_merchant_id,
            finix_identity_id: merchant.finix_identity_id,
            merchant_name: merchant.merchant_name,
            fraud_session_id: fraud_session_id,
            idempotency_uuid: idempotencyUuid,
            raw_finix_response: JSON.stringify(finixData),
            subcategory: merchant.subcategory,
            statement_descriptor: merchant.statement_descriptor || merchant.merchant_name,
            // Add fee structure fields if available
            ...(feeProfile && {
              basis_points: feeProfile.basis_points,
              fixed_fee: feeProfile.fixed_fee,
              ach_basis_points: feeProfile.ach_basis_points,
              ach_fixed_fee: feeProfile.ach_fixed_fee,
              ach_basis_points_fee_limit: feeProfile.ach_basis_points_fee_limit
            })
          };
          
          console.log('Updating tax submission with complete payment data');
          
          const { error: taxUpdateError } = await supabase
            .from('tax_submissions')
            .update(taxUpdate)
            .eq('id', entity_id);
            
          if (taxUpdateError) {
            console.error('Failed to update tax submission status:', taxUpdateError);
            throw taxUpdateError;
          } else {
            console.log('Tax submission updated and filed successfully');
            
            // Confirm any staged documents for this tax submission
            const { error: docConfirmError } = await supabase.rpc(
              'confirm_staged_tax_documents',
              {
                p_staging_id: idempotencyUuid,
                p_tax_submission_id: entity_id
              }
            );
            
            if (docConfirmError) {
              console.log('Warning: Failed to confirm staged documents:', docConfirmError);
              // Don't fail the payment for document confirmation issues
            }
          }
          
        } else if (entity_type === 'business_license') {
          const licenseUpdate = {
            payment_status: 'paid',
            payment_processed_at: new Date().toISOString(),
            finix_transfer_id: finixData.id,
            transfer_state: 'SUCCEEDED',
            application_status: 'issued'
          };
          
          const { error: licenseUpdateError } = await supabase
            .from('business_license_applications')
            .update(licenseUpdate)
            .eq('id', entity_id);
            
          if (licenseUpdateError) {
            console.error('Failed to update business license status:', licenseUpdateError);
            throw licenseUpdateError;
          }
          console.log('Successfully updated business license status to issued after Google Pay payment');
          
        } else if (entity_type === 'service_application') {
          const serviceUpdate = {
            payment_status: 'paid',
            payment_processed_at: new Date().toISOString(),
            finix_transfer_id: finixData.id,
            transfer_state: 'SUCCEEDED'
          };
          
          const { error: serviceUpdateError } = await supabase
            .from('municipal_service_applications')
            .update(serviceUpdate)
            .eq('id', entity_id);
            
          if (serviceUpdateError) {
            console.error('Failed to update service application status:', serviceUpdateError);
            throw serviceUpdateError;
          }
          console.log('Successfully updated service application payment status after Google Pay payment');
        }
        
      } catch (entityError) {
        console.error(`Error updating ${entity_type} status:`, entityError);
        
        // Mark payment transaction as failed due to entity update error
        await supabase
          .from('payment_transactions')
          .update({
            payment_status: 'failed',
            error_details: entityError
          })
          .eq('id', transactionId);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Payment succeeded but failed to update ${entity_type}: ${entityError instanceof Error ? entityError.message : 'Unknown error'}`,
              retryable: false
            }),
            { status: 500, headers: corsHeaders }
          );
      }
    }

    console.log('=== GOOGLE PAY PAYMENT COMPLETED SUCCESSFULLY ===');

    const response: UnifiedGooglePayResponse = {
      success: true,
      transaction_id: transactionId,
      finix_transfer_id: finixData.id,
      finix_payment_instrument_id: piData.id,
      service_fee_cents: serviceFeeFromDB,
      total_amount_cents: totalAmountFromDB
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unified Google Pay processing error:', error);
    
    const classifiedError = classifyPaymentError(error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: classifiedError.message,
        retryable: classifiedError.retryable,
        error_type: classifiedError.type
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});