import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { 
  classifyPaymentError, 
  generateIdempotencyId,
  generateDeterministicUUID,
  generateIdempotencyMetadata,
  isValidUUID 
} from '../shared/paymentUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UnifiedPaymentRequest {
  entity_type: 'permit' | 'business_license' | 'tax_submission' | 'service_application';
  entity_id: string;
  customer_id: string;
  merchant_id: string;
  base_amount_cents: number;
  payment_instrument_id: string;
  payment_type: 'card' | 'ach' | 'google-pay' | 'apple-pay';
  fraud_session_id?: string;
  card_brand?: string;
  card_last_four?: string;
  bank_last_four?: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
  idempotency_id?: string; // Legacy - kept for backward compatibility
  session_uuid?: string; // New: Payment session UUID from client
  idempotency_metadata?: any; // New: Client-side metadata for tracking
}

interface UnifiedPaymentResponse {
  success: boolean;
  transaction_id?: string;
  finix_transfer_id?: string;
  service_fee_cents?: number;
  total_amount_cents?: number;
  error?: string;
  retryable?: boolean;
}

async function reconcileEntityIfNeeded(supabase: any, transaction: any, entity_type: string, entity_id: string, user_id: string, customer_id: string, merchant_id: string, idempotency_id: string, merchant: any) {
  console.log('=== RECONCILING ENTITY IF NEEDED ===');
  
  try {
    if (entity_type === 'tax_submission') {
      // Check if tax submission needs updating
      const { data: taxSubmission, error: fetchError } = await supabase
        .from('tax_submissions')
        .select('payment_status, payment_processed_at, finix_transfer_id')
        .eq('id', entity_id)
        .single();
      
      if (fetchError) {
        console.error('Failed to fetch tax submission for reconciliation:', fetchError);
        return;
      }
      
      // Update if payment status is not paid or missing key fields
      if (taxSubmission.payment_status !== 'paid' || !taxSubmission.payment_processed_at || !taxSubmission.finix_transfer_id) {
        console.log('Reconciling tax submission - updating payment status and details');
        
        const { error: updateError } = await supabase
          .from('tax_submissions')
          .update({
            payment_status: 'paid',
            submission_status: 'approved',
            transfer_state: 'SUCCEEDED',
            payment_processed_at: new Date().toISOString(),
            finix_transfer_id: transaction.finix_transfer_id,
            service_fee_cents: transaction.service_fee_cents,
            idempotency_id: idempotency_id
          })
          .eq('id', entity_id);
        
        if (updateError) {
          console.error('Failed to reconcile tax submission:', updateError);
        } else {
          console.log('Tax submission reconciled successfully');
        }
      }
      
      // Check if payment transaction record exists
      const { data: existingHistory, error: historyFetchError } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('idempotency_id', idempotency_id)
        .single();
      
      if (historyFetchError && historyFetchError.code === 'PGRST116') {
        // No payment transaction record exists, create one
        console.log('Creating missing payment transaction record during reconciliation');
        
        const { error: historyCreateError } = await supabase
          .from('payment_transactions')
          .insert({
            user_id: user_id,
            customer_id: customer_id,
            tax_submission_id: entity_id,
            base_amount_cents: transaction.total_amount_cents - transaction.service_fee_cents,
            service_fee_cents: transaction.service_fee_cents,
            total_amount_cents: transaction.total_amount_cents,
            payment_type: 'card', // Default assumption for reconciliation
            payment_status: 'completed',
            payment_method_type: 'card',
            idempotency_id: idempotency_id,
            merchant_id: merchant_id,
            finix_merchant_id: merchant.finix_merchant_id,
            merchant_name: merchant.merchant_name,
            category: merchant.category,
            subcategory: merchant.subcategory,
            statement_descriptor: merchant.merchant_name,
            transfer_state: 'SUCCEEDED',
            finix_transfer_id: transaction.finix_transfer_id,
            payment_processed_at: new Date().toISOString()
          });
        
        if (historyCreateError) {
          console.error('Failed to create payment transaction during reconciliation:', historyCreateError);
        } else {
          console.log('Payment transaction record created during reconciliation');
        }
      }
    }
  } catch (error) {
    console.error('Error during entity reconciliation:', error);
    // Don't throw - reconciliation is best effort
  }
}

Deno.serve(async (req) => {
  console.log('=== UNIFIED PAYMENT REQUEST ===');
  
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
    const body: UnifiedPaymentRequest = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const {
      entity_type,
      entity_id,
      customer_id,
      merchant_id,
      base_amount_cents,
      payment_instrument_id,
      payment_type,
      fraud_session_id,
      card_brand,
      card_last_four,
      bank_last_four,
      first_name,
      last_name,
      user_email,
      idempotency_id: clientIdempotencyId, // Legacy
      session_uuid,
      idempotency_metadata: clientMetadata
    } = body;

    // Validate required fields
    if (!entity_type || !entity_id || !customer_id || !merchant_id || !base_amount_cents || !payment_instrument_id || !payment_type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
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

    // Get merchant information
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('finix_merchant_id, finix_identity_id, merchant_name, category, subcategory, statement_descriptor')
      .eq('id', merchant_id)
      .single();

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

    // Get merchant fee profile for fee structure
    const { data: feeProfile, error: feeProfileError } = await supabase
      .from('merchant_fee_profiles')
      .select('basis_points, fixed_fee, ach_basis_points, ach_fixed_fee, ach_basis_points_fee_limit')
      .eq('merchant_id', merchant_id)
      .single();

    if (feeProfileError) {
      console.log('Warning: Could not fetch fee profile:', feeProfileError);
      // Continue without fee profile data - not critical for payment processing
    }

    // Get user's Finix payment instrument ID
    let finixPaymentInstrumentId = payment_instrument_id;
    
    // If payment_instrument_id is a UUID, get the Finix payment instrument ID
    if (['card', 'PAYMENT_CARD'].includes(payment_type) && payment_instrument_id.length === 36) {
      const { data: paymentInstrument, error: piError } = await supabase
        .from('user_payment_instruments')
        .select('finix_payment_instrument_id')
        .eq('id', payment_instrument_id)
        .eq('user_id', user.id)
        .eq('enabled', true)
        .single();

      if (piError || !paymentInstrument) {
        console.error('Payment instrument fetch error:', piError);
        return new Response(
          JSON.stringify({ success: false, error: 'Payment instrument not found or access denied', retryable: false }),
          { status: 404, headers: corsHeaders }
        );
      }

      finixPaymentInstrumentId = paymentInstrument.finix_payment_instrument_id;
    }

    // Generate deterministic UUID for idempotency
    // This ensures same inputs = same UUID for proper deduplication
    const idempotencyUuid = generateDeterministicUUID({
      entityType: entity_type,
      entityId: entity_id,
      userId: user.id,
      sessionId: session_uuid || 'no-session',
      paymentInstrumentId: payment_instrument_id
    });
    
    console.log('Generated idempotency UUID:', idempotencyUuid);
    
    // Generate comprehensive metadata for debugging
    const metadata = generateIdempotencyMetadata({
      sessionId: session_uuid,
      entityType: entity_type,
      entityId: entity_id,
      userId: user.id,
      paymentMethod: payment_type,
      paymentInstrumentId: payment_instrument_id,
      clientUserAgent: clientMetadata?.client_user_agent,
      clientIp: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
    });
    
    console.log('Idempotency metadata:', metadata);
    
    // Keep legacy idempotency_id for backward compatibility
    const idempotency_id = clientIdempotencyId || generateIdempotencyId('unified_payment', entity_id);
    console.log('Legacy idempotency ID:', idempotency_id, clientIdempotencyId ? '(client-provided)' : '(generated)');

    // Check for existing payment transaction with this UUID
    console.log('Checking for duplicate payment with UUID:', idempotencyUuid);
    const { data: existingTransaction, error: existingError } = await supabase
      .from('payment_transactions')
      .select('id, payment_status, finix_transfer_id, service_fee_cents, total_amount_cents')
      .eq('idempotency_uuid', idempotencyUuid)
      .maybeSingle();

    if (existingTransaction && !existingError) {
      console.log('Found existing transaction with idempotency ID:', existingTransaction);
      
      // If payment is already completed, reconcile entity if needed and return result
      if (['paid', 'completed'].includes(existingTransaction.payment_status)) {
        console.log('Returning existing successful payment result');
        
        // Reconcile entity if it wasn't updated properly
        await reconcileEntityIfNeeded(supabase, existingTransaction, entity_type, entity_id, user.id, customer_id, merchant_id, idempotency_id, merchant);
        
        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: existingTransaction.id,
            finix_transfer_id: existingTransaction.finix_transfer_id,
            service_fee_cents: existingTransaction.service_fee_cents,
            total_amount_cents: existingTransaction.total_amount_cents,
            duplicate_prevented: true
          }),
          { status: 200, headers: corsHeaders }
        );
      }
      
      // If payment is still pending, return error to prevent duplicate attempts
      if (existingTransaction.payment_status === 'pending') {
        console.log('Found pending payment with same idempotency ID');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Payment with this identifier is already being processed',
            retryable: false
          }),
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // STEP 1: Call Finix API first (fail fast if payment fails)
    console.log('=== CALLING FINIX API FIRST ===');
    
    const finixApplicationId = Deno.env.get('FINIX_APPLICATION_ID');
    const finixApiSecret = Deno.env.get('FINIX_API_SECRET');
    const finixEnvironment = Deno.env.get('FINIX_ENVIRONMENT') || 'sandbox';
    
    if (!finixApplicationId || !finixApiSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Finix credentials not configured', retryable: false }),
        { status: 500, headers: corsHeaders }
      );
    }

    const finixApiUrl = finixEnvironment === 'production' 
      ? 'https://finix.payments-api.com'
      : 'https://finix.sandbox-payments-api.com';

    const finixCredentials = btoa(`${finixApplicationId}:${finixApiSecret}`);

    // Calculate total amount using same logic as database function
    // We'll get the exact amounts from the database function, but we need total for Finix
    let serviceFeeFromDB = 0;
    let totalAmountFromDB = 0;
    
    // Calculate if this is a card payment
    const isCard = ['card', 'google-pay', 'apple-pay'].includes(payment_type);
    
    // Get fee calculation from database to match exactly
    const { data: feeCalcResult, error: feeCalcError } = await supabase.rpc(
      'create_unified_payment_transaction',
      {
        p_user_id: user.id,
        p_customer_id: customer_id,
        p_merchant_id: merchant_id,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_base_amount_cents: base_amount_cents,
        p_payment_instrument_id: finixPaymentInstrumentId,
        p_payment_type: payment_type,
        p_fraud_session_id: fraud_session_id || null,
        p_idempotency_id: idempotency_id,
        p_idempotency_uuid: idempotencyUuid,
        p_idempotency_metadata: metadata,
        p_is_card: isCard,
        p_card_brand: card_brand || null,
        p_card_last_four: card_last_four || null,
        p_bank_last_four: bank_last_four || null,
        p_first_name: first_name || null,
        p_last_name: last_name || null,
        p_user_email: user_email || null
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

    serviceFeeFromDB = feeCalcResult.service_fee_cents;
    totalAmountFromDB = feeCalcResult.total_amount_cents;
    const transactionId = feeCalcResult.transaction_id;

    console.log('Database fee calculation:', {
      service_fee: serviceFeeFromDB,
      total_amount: totalAmountFromDB,
      transaction_id: transactionId
    });

    // Create Finix transfer
    const transferPayload = {
      merchant: merchant.finix_merchant_id,
      currency: 'USD',
      amount: totalAmountFromDB,
      source: finixPaymentInstrumentId,
      idempotency_id: idempotency_id,
      ...(fraud_session_id && { fraud_session_id })
    };

    console.log('Creating Finix transfer:', transferPayload);

    const finixResponse = await fetch(`${finixApiUrl}/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${finixCredentials}`,
        'Content-Type': 'application/json',
        'Finix-Version': '2022-02-01'
      },
      body: JSON.stringify(transferPayload)
    });

    const finixData = await finixResponse.json();
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

    // STEP 2: Update payment record with success details and entity status atomically
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

    // STEP 3: Update entity status if payment succeeded
    if (finixData.state === 'SUCCEEDED') {
      console.log('=== UPDATING ENTITY STATUS ===');
      
      try {
        let entityUpdateError = null;
        
        switch (entity_type) {
          case 'permit':
            // Get current permit status
            const { data: permit, error: permitFetchError } = await supabase
              .from('permit_applications')
              .select('application_status, municipal_review_status')
              .eq('permit_id', entity_id)
              .single();
            
            if (permitFetchError) {
              console.error('Failed to fetch permit status:', permitFetchError);
              entityUpdateError = permitFetchError;
              break;
            }
            
            // Prepare update data
            const permitUpdate: any = {
              payment_status: 'paid',
              payment_processed_at: new Date().toISOString(),
              finix_transfer_id: finixData.id,
              transfer_state: 'SUCCEEDED'
            };
            
            // Auto-issue if approved
            if (permit.application_status === 'approved') {
              permitUpdate.application_status = 'issued';
              permitUpdate.issued_at = new Date().toISOString();
              console.log('Auto-issuing permit after successful payment');
            }
            
            const { error: permitError } = await supabase
              .from('permit_applications')
              .update(permitUpdate)
              .eq('permit_id', entity_id);
            entityUpdateError = permitError;
            break;

          case 'business_license':
            // Get current license status
            const { data: license, error: licenseFetchError } = await supabase
              .from('business_license_applications')
              .select('application_status')
              .eq('id', entity_id)
              .single();
            
            if (licenseFetchError) {
              console.error('Failed to fetch license status:', licenseFetchError);
              entityUpdateError = licenseFetchError;
              break;
            }
            
            // Prepare update data
            const licenseUpdate: any = {
              payment_status: 'paid',
              payment_processed_at: new Date().toISOString(),
              finix_transfer_id: finixData.id,
              transfer_state: 'SUCCEEDED',
              service_fee_cents: serviceFeeFromDB,
              total_amount_cents: totalAmountFromDB
            };
            
            // Auto-issue if approved
            if (license.application_status === 'approved') {
              licenseUpdate.application_status = 'issued';
              licenseUpdate.issued_at = new Date().toISOString();
              console.log('Auto-issuing business license after successful payment');
            }
            
            const { error: licenseError } = await supabase
              .from('business_license_applications')
              .update(licenseUpdate)
              .eq('id', entity_id);
            entityUpdateError = licenseError;
            break;

          case 'service_application':
            // Get current service application status and check if review is required
            const { data: serviceApp, error: serviceFetchError } = await supabase
              .from('municipal_service_applications')
              .select('status, tile_id, municipal_service_tiles!inner(requires_review)')
              .eq('id', entity_id)
              .single();
            
            if (serviceFetchError) {
              console.error('Failed to fetch service application status:', serviceFetchError);
              entityUpdateError = serviceFetchError;
              break;
            }
            
            // Prepare update data
            const serviceUpdate: any = {
              payment_status: 'paid',
              payment_processed_at: new Date().toISOString(),
              finix_transfer_id: finixData.id
            };
            
            // Check if service requires review
            const requiresReview = (serviceApp.municipal_service_tiles as any)?.requires_review;
            
            // Auto-issue logic based on review requirement
            if (!requiresReview) {
              // Non-reviewable services: auto-issue immediately after payment
              serviceUpdate.status = 'issued';
              serviceUpdate.issued_at = new Date().toISOString();
              console.log('Auto-issuing non-reviewable service application after payment');
            } else if (serviceApp.status === 'approved') {
              // Reviewable services: only auto-issue if already approved
              serviceUpdate.status = 'issued';
              serviceUpdate.issued_at = new Date().toISOString();
              console.log('Auto-issuing approved reviewable service application after payment');
            }
            
            const { error: serviceError } = await supabase
              .from('municipal_service_applications')
              .update(serviceUpdate)
              .eq('id', entity_id);
            entityUpdateError = serviceError;
            break;

          case 'tax_submission':
            // Update existing draft tax submission with payment data
            console.log('Updating total_amount_due_cents instead of total_amount_cents for tax submission');
            const taxUpdate = {
              payment_status: 'paid',
              submission_status: 'submitted',
              transfer_state: finixData.state || 'PENDING',
              finix_transfer_id: finixData.id,
              service_fee_cents: serviceFeeFromDB,
              total_amount_due_cents: totalAmountFromDB,
              payment_processed_at: new Date().toISOString(),
              filed_at: new Date().toISOString(),
              payment_type: payment_type,
              payment_instrument_id: finixPaymentInstrumentId,
              // Add missing Finix and merchant data
              finix_merchant_id: merchant.finix_merchant_id,
              finix_identity_id: merchant.finix_identity_id,
              merchant_name: merchant.merchant_name,
              fraud_session_id: fraud_session_id,
              idempotency_id: idempotency_id,
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

            console.log('Updating existing tax submission with payment data');
            
            const { error: taxUpdateError } = await supabase
              .from('tax_submissions')
              .update(taxUpdate)
              .eq('id', entity_id);
            
            if (taxUpdateError) {
              console.error('Failed to update tax submission:', taxUpdateError);
              entityUpdateError = taxUpdateError;
            } else {
              console.log('Tax submission updated and filed successfully');
              
              // Create payment transaction record
              const { error: paymentHistoryError } = await supabase
                .from('payment_transactions')
                .insert({
                  user_id: user.id,
                  customer_id: customer_id,
                  tax_submission_id: entity_id,
                  amount_cents: base_amount_cents,
                  service_fee_cents: serviceFeeFromDB,
                  total_amount_cents: totalAmountFromDB,
                  payment_type: payment_type,
                  payment_status: 'completed',
                  payment_method_type: payment_type,
                  payment_instrument_id: finixPaymentInstrumentId,
                  idempotency_id: idempotency_id,
                  fraud_session_id: fraud_session_id,
                  card_brand: card_brand,
                  card_last_four: card_last_four,
                  bank_last_four: bank_last_four,
                  merchant_id: merchant_id,
                  finix_merchant_id: merchant.finix_merchant_id,
                  merchant_name: merchant.merchant_name,
                  category: merchant.category,
                  subcategory: merchant.subcategory,
                  statement_descriptor: merchant.merchant_name,
                  transfer_state: finixData.state || 'PENDING',
                  finix_transfer_id: finixData.id
                });
              
              if (paymentHistoryError) {
                console.log('Warning: Failed to create payment transaction:', paymentHistoryError);
                // Don't fail the payment for transaction record issues
              }
              
              // Confirm any staged documents for this tax submission
              const { error: docConfirmError } = await supabase.rpc(
                'confirm_staged_tax_documents',
                {
                  p_staging_id: idempotency_id,
                  p_tax_submission_id: entity_id
                }
              );
              
              if (docConfirmError) {
                console.log('Warning: Failed to confirm staged documents:', docConfirmError);
                // Don't fail the payment for document confirmation issues
              }
            }
            
            entityUpdateError = taxUpdateError;
            break;

          default:
            console.warn(`Unknown entity type: ${entity_type}`);
            break;
        }

        if (entityUpdateError) {
          console.error(`Failed to update ${entity_type} status:`, entityUpdateError);
          
          // Mark payment transaction as failed due to entity update error
          await supabase
            .from('payment_transactions')
            .update({
              payment_status: 'failed',
              error_details: entityUpdateError
            })
            .eq('id', transactionId);
            
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Payment succeeded but failed to update ${entity_type}: ${entityUpdateError.message}`,
              retryable: false
            }),
            { status: 500, headers: corsHeaders }
          );
        } else {
          console.log(`Successfully updated ${entity_type} status to paid and auto-issued if applicable`);
        }
      } catch (entityError) {
        console.error('Error updating entity status:', entityError);
        // Continue anyway - the payment went through
      }
    }

    console.log('=== PAYMENT COMPLETED SUCCESSFULLY ===');

    const response: UnifiedPaymentResponse = {
      success: true,
      transaction_id: transactionId,
      finix_transfer_id: finixData.id,
      service_fee_cents: serviceFeeFromDB,
      total_amount_cents: totalAmountFromDB
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unified payment processing error:', error);
    
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