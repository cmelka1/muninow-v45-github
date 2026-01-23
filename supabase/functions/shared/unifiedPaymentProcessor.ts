import { FinixAPI } from './finixAPI.ts';
import { generateDeterministicUUID, generateIdempotencyMetadata } from './paymentUtils.ts';

// Type definitions
export interface UnifiedPaymentParams {
  entityType: 'permit' | 'business_license' | 'service_application' | 'tax_submission';
  entityId: string;
  merchantId: string;
  baseAmountCents: number;
  paymentInstrumentId: string;
  fraudSessionId?: string;
  clientSessionId?: string;
  userId: string;
  userEmail: string;
  paymentType: 'PAYMENT_CARD' | 'BANK_ACCOUNT' | 'card' | 'ach' | 'google-pay' | 'apple-pay';
  cardBrand?: string;
  cardLastFour?: string;
  bankLastFour?: string;
  firstName?: string;
  lastName?: string;
}

export interface UnifiedPaymentResponse {
  success: boolean;
  transaction_id?: string;
  payment_id?: string;
  finix_transfer_id?: string;
  finix_payment_instrument_id?: string;
  service_fee_cents?: number;
  total_amount_cents?: number;
  status?: string;
  error?: string;
  retryable?: boolean;
  duplicate_prevented?: boolean;
}

// Main payment processor
export async function processUnifiedPayment(
  params: UnifiedPaymentParams,
  supabase: any
): Promise<UnifiedPaymentResponse> {
  
  console.log('[UnifiedPaymentProcessor] Starting payment processing:', {
    entityType: params.entityType,
    entityId: params.entityId,
    baseAmountCents: params.baseAmountCents
  });

  try {
    // STEP 1: VALIDATION
    const validationResult = validatePaymentParams(params);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
        retryable: false
      };
    }

    // STEP 2: GENERATE IDEMPOTENCY UUID
    const idempotencyUuid = generateDeterministicUUID({
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      sessionId: params.clientSessionId || 'no-session',
      baseAmountCents: params.baseAmountCents,
      paymentInstrumentId: params.paymentInstrumentId
    });

    const idempotencyMetadata = generateIdempotencyMetadata({
      sessionId: params.clientSessionId,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      paymentMethod: params.paymentType,
      paymentInstrumentId: params.paymentInstrumentId
    });

    console.log('[UnifiedPaymentProcessor] Generated idempotency UUID:', idempotencyUuid);

    // STEP 3: CHECK FOR DUPLICATE TRANSACTION
    const duplicateCheck = await checkForDuplicateTransaction(
      supabase,
      idempotencyUuid
    );

    if (duplicateCheck.isDuplicate) {
      console.log('[UnifiedPaymentProcessor] Duplicate transaction found');
      return duplicateCheck.response!;
    }

    // STEP 4: FETCH MERCHANT DATA
    const merchantData = await fetchMerchantData(supabase, params.merchantId);
    if (!merchantData.success) {
      return {
        success: false,
        error: merchantData.error,
        retryable: false
      };
    }

    // STEP 5: GET FINIX PAYMENT INSTRUMENT ID (if UUID provided)
    let finixPaymentInstrumentId = params.paymentInstrumentId;
    
    if (['card', 'PAYMENT_CARD'].includes(params.paymentType) && params.paymentInstrumentId.length === 36) {
      const { data: paymentInstrument } = await supabase
        .from('user_payment_instruments')
        .select('finix_payment_instrument_id')
        .eq('id', params.paymentInstrumentId)
        .eq('user_id', params.userId)
        .eq('enabled', true)
        .single();

      if (paymentInstrument) {
        finixPaymentInstrumentId = paymentInstrument.finix_payment_instrument_id;
      }
    }

    // STEP 6: CREATE PAYMENT TRANSACTION (calculates fees)
    const transactionResult = await createPaymentTransaction(
      supabase,
      params,
      idempotencyUuid,
      idempotencyMetadata,
      finixPaymentInstrumentId,
      merchantData.customerId
    );

    if (!transactionResult.success) {
      return {
        success: false,
        error: transactionResult.error,
        retryable: false
      };
    }

    const transactionId = transactionResult.transaction_id!;
    const totalAmountCents = transactionResult.total_amount_cents!;
    const serviceFeeCents = transactionResult.service_fee_cents!;

    console.log('[UnifiedPaymentProcessor] Transaction created:', {
      transactionId,
      totalAmountCents,
      serviceFee: serviceFeeCents
    });

    // STEP 7: EXECUTE FINIX TRANSFER
    const finixAPI = new FinixAPI();
    const transferResult = await finixAPI.createTransfer({
      amount: totalAmountCents,
      currency: 'USD',
      merchant: merchantData.finixMerchantId!,
      source: finixPaymentInstrumentId,
      idempotency_id: idempotencyUuid,
      fraud_session_id: params.fraudSessionId,
      tags: {
        entity_type: params.entityType,
        entity_id: params.entityId,
        user_id: params.userId,
        transaction_id: transactionId
      }
    });

    if (!transferResult.success) {
      console.error('[UnifiedPaymentProcessor] Finix transfer failed:', transferResult.error);
      
      // ROLLBACK: Delete transaction
      await rollbackTransaction(supabase, transactionId);
      
      return {
        success: false,
        error: transferResult.error || 'Payment processing failed',
        retryable: true
      };
    }

    console.log('[UnifiedPaymentProcessor] Finix transfer succeeded:', transferResult.data?.id);

    // STEP 8: UPDATE TRANSACTION STATUS
    await updateTransactionStatus(
      supabase,
      transactionId,
      transferResult.data!.id,
      finixPaymentInstrumentId,
      'paid',
      'SUCCEEDED',
      transferResult.raw_response
    );

    // STEP 9: UPDATE TAX SUBMISSION WITH FINAL AMOUNTS (if applicable)
    if (params.entityType === 'tax_submission') {
      const { error: taxUpdateError } = await supabase
        .from('tax_submissions')
        .update({
          total_amount_due_cents: totalAmountCents,
          service_fee_cents: serviceFeeCents,
          payment_status: 'unpaid', // Payment initiated
          updated_at: new Date().toISOString()
        })
        .eq('id', params.entityId);
        
      if (taxUpdateError) {
        console.error('[UnifiedPaymentProcessor] Failed to update tax submission with payment amounts:', taxUpdateError);
        // Continue anyway - payment was created, this is just metadata
      } else {
        console.log('[UnifiedPaymentProcessor] Updated tax submission with final amounts:', {
          entityId: params.entityId,
          totalAmountCents,
          serviceFeeCents
        });
      }
    }

    // STEP 10: UPDATE ENTITY STATUS
    await updateEntityStatus(
      supabase,
      params.entityType,
      params.entityId,
      idempotencyUuid,
      serviceFeeCents,
      totalAmountCents,
      finixPaymentInstrumentId,
      transferResult.data!.id,
      merchantData
    );

    // STEP 11: AUTO-ISSUE ENTITY (if applicable)
    await autoIssueEntity(supabase, params.entityType, params.entityId);

    return {
      success: true,
      transaction_id: transactionId,
      payment_id: transferResult.data?.id,
      finix_transfer_id: transferResult.data?.id,
      finix_payment_instrument_id: finixPaymentInstrumentId,
      service_fee_cents: serviceFeeCents,
      total_amount_cents: totalAmountCents,
      status: 'paid'
    };

  } catch (error) {
    console.error('[UnifiedPaymentProcessor] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      retryable: true
    };
  }
}

// Helper: Validate payment parameters
function validatePaymentParams(params: UnifiedPaymentParams): { valid: boolean; error?: string } {
  if (!params.entityType || !params.entityId) {
    return { valid: false, error: 'Entity type and ID are required' };
  }

  if (!params.merchantId) {
    return { valid: false, error: 'Merchant ID is required' };
  }

  if (!params.baseAmountCents || params.baseAmountCents <= 0) {
    return { valid: false, error: 'Base amount must be greater than zero' };
  }

  if (!params.paymentInstrumentId) {
    return { valid: false, error: 'Payment instrument ID is required' };
  }

  const validEntityTypes = ['permit', 'business_license', 'service_application', 'tax_submission'];
  if (!validEntityTypes.includes(params.entityType)) {
    return { valid: false, error: 'Invalid entity type' };
  }

  return { valid: true };
}

// Helper: Check for duplicate transaction
async function checkForDuplicateTransaction(
  supabase: any,
  idempotencyUuid: string
): Promise<{ isDuplicate: boolean; response?: UnifiedPaymentResponse }> {
  
  const { data: existingTransaction, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('idempotency_uuid', idempotencyUuid)
    .maybeSingle();

  if (error || !existingTransaction) {
    return { isDuplicate: false };
  }

  // Found duplicate
  if (existingTransaction.payment_status === 'paid') {
    return {
      isDuplicate: true,
      response: {
        success: true,
        transaction_id: existingTransaction.id,
        payment_id: existingTransaction.finix_transfer_id,
        finix_transfer_id: existingTransaction.finix_transfer_id,
        finix_payment_instrument_id: existingTransaction.finix_payment_instrument_id || existingTransaction.payment_instrument_id,
        service_fee_cents: existingTransaction.service_fee_cents,
        total_amount_cents: existingTransaction.total_amount_cents,
        status: existingTransaction.payment_status,
        duplicate_prevented: true
      }
    };
  }

  if (existingTransaction.payment_status === 'unpaid') {
    return {
      isDuplicate: true,
      response: {
        success: false,
        error: 'Payment is already being processed',
        retryable: false
      }
    };
  }

  return { isDuplicate: false };
}

// Helper: Fetch merchant data
async function fetchMerchantData(
  supabase: any,
  merchantId: string
): Promise<{ success: boolean; finixMerchantId?: string; finixIdentityId?: string; merchantName?: string; category?: string; subcategory?: string; statementDescriptor?: string; customerId?: string; error?: string }> {
  
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('finix_merchant_id, finix_identity_id, merchant_name, category, subcategory, statement_descriptor, customer_id')
    .eq('id', merchantId)
    .single();

  if (error || !merchant) {
    return {
      success: false,
      error: 'Merchant not found'
    };
  }

  if (!merchant.finix_merchant_id || !merchant.finix_identity_id) {
    return {
      success: false,
      error: 'Merchant is not configured for payments'
    };
  }

  return {
    success: true,
    finixMerchantId: merchant.finix_merchant_id,
    finixIdentityId: merchant.finix_identity_id,
    merchantName: merchant.merchant_name,
    category: merchant.category,
    subcategory: merchant.subcategory,
    statementDescriptor: merchant.statement_descriptor,
    customerId: merchant.customer_id
  };
}

// Helper: Create payment transaction (calls RPC)
async function createPaymentTransaction(
  supabase: any,
  params: UnifiedPaymentParams,
  idempotencyUuid: string,
  idempotencyMetadata: any,
  finixPaymentInstrumentId: string,
  customerId?: string
): Promise<{ success: boolean; transaction_id?: string; service_fee_cents?: number; total_amount_cents?: number; error?: string }> {
  
  const isCard = ['card', 'PAYMENT_CARD', 'google-pay', 'apple-pay'].includes(params.paymentType);

  const { data, error } = await supabase.rpc('create_unified_payment_transaction', {
    p_user_id: params.userId,
    p_customer_id: customerId || null,
    p_merchant_id: params.merchantId,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId,
    p_base_amount_cents: params.baseAmountCents,
    p_payment_instrument_id: finixPaymentInstrumentId,
    p_payment_type: params.paymentType,
    p_fraud_session_id: params.fraudSessionId || null,
    p_idempotency_uuid: idempotencyUuid,
    p_idempotency_metadata: idempotencyMetadata,
    p_is_card: isCard,
    p_card_brand: params.cardBrand || null,
    p_card_last_four: params.cardLastFour || null,
    p_bank_last_four: params.bankLastFour || null,
    p_first_name: params.firstName || null,
    p_last_name: params.lastName || null,
    p_user_email: params.userEmail
  });

  if (error || !data || !data.success) {
    console.error('[createPaymentTransaction] Error:', error, data);
    return {
      success: false,
      error: error?.message || data?.error || 'Failed to create transaction'
    };
  }

  // FIX 2: Populate entity foreign key
  const entityKeyMap: Record<string, string> = {
    'permit': 'permit_id',
    'business_license': 'business_license_id',
    'service_application': 'service_application_id',
    'tax_submission': 'tax_submission_id'
  };

  const entityKey = entityKeyMap[params.entityType];
  if (entityKey && data.transaction_id) {
    await supabase
      .from('payment_transactions')
      .update({ [entityKey]: params.entityId })
      .eq('id', data.transaction_id);
  }

  return {
    success: true,
    transaction_id: data.transaction_id,
    service_fee_cents: data.service_fee_cents,
    total_amount_cents: data.total_amount_cents
  };
}

// Helper: Rollback transaction
async function rollbackTransaction(
  supabase: any,
  transactionId: string
): Promise<void> {
  console.log('[rollbackTransaction] Rolling back transaction:', transactionId);
  
  await supabase
    .from('payment_transactions')
    .delete()
    .eq('id', transactionId);
}

// Helper: Update transaction status
export async function updateTransactionStatus(
  supabase: any,
  transactionId: string,
  finixTransferId: string,
  finixPaymentInstrumentId: string,
  paymentStatus: string,
  transferState: string,
  rawFinixResponse?: any
): Promise<{ success: boolean }> {
  
  const updateData: any = {
    finix_transfer_id: finixTransferId,
    finix_payment_instrument_id: finixPaymentInstrumentId,
    payment_status: paymentStatus,
    transfer_state: transferState
  };

  // FIX 3: Store raw Finix response for debugging
  if (rawFinixResponse) {
    updateData.raw_finix_response = rawFinixResponse;
  }

  const { error } = await supabase
    .from('payment_transactions')
    .update(updateData)
    .eq('id', transactionId);

  if (error) {
    console.error('[updateTransactionStatus] Error:', error);
  }

  return { success: !error };
}

// Helper: Map payment type to PostgreSQL ENUM
export function mapPaymentTypeToEnum(paymentType: string): string {
  const enumMap: Record<string, string> = {
    'card': 'PAYMENT_CARD',
    'ach': 'BANK_ACCOUNT',
    'google-pay': 'PAYMENT_CARD',
    'apple-pay': 'PAYMENT_CARD',
    'PAYMENT_CARD': 'PAYMENT_CARD',
    'BANK_ACCOUNT': 'BANK_ACCOUNT'
  };
  return enumMap[paymentType] || 'PAYMENT_CARD';
}

// Helper: Update entity status
export async function updateEntityStatus(
  supabase: any,
  entityType: string,
  entityId: string,
  idempotencyUuid: string,
  serviceFee: number,
  totalAmount: number,
  finixPaymentInstrumentId: string,
  finixTransferId: string,
  merchantData: any
): Promise<{ success: boolean }> {
  
  const tableMap: Record<string, string> = {
    'permit': 'permit_applications',
    'business_license': 'business_license_applications',
    'service_application': 'municipal_service_applications',
    'tax_submission': 'tax_submissions'
  };

  const primaryKeyMap: Record<string, string> = {
    'permit': 'permit_id',
    'business_license': 'id',
    'service_application': 'id',
    'tax_submission': 'id'
  };

  const tableName = tableMap[entityType];
  const primaryKeyColumn = primaryKeyMap[entityType] || 'id';
  
  if (!tableName) {
    return { success: false };
  }

  const updateData: any = {
    payment_status: 'paid',
    idempotency_uuid: idempotencyUuid,
    service_fee_cents: serviceFee,
    transfer_state: 'SUCCEEDED',
    payment_processed_at: new Date().toISOString(),
    payment_instrument_id: finixPaymentInstrumentId,
    finix_transfer_id: finixTransferId,
    finix_merchant_id: merchantData.finixMerchantId,
    merchant_name: merchantData.merchantName,
    submitted_at: new Date().toISOString()  // Set submitted_at when payment succeeds
  };

  // Update status to 'submitted' if currently 'draft' (will be overridden by autoIssueEntity if applicable)
  if (entityType === 'service_application') {
    updateData.status = 'submitted';
  }

  // Use correct column name based on entity type
  if (entityType === 'tax_submission') {
    updateData.total_amount_due_cents = totalAmount;  // Tax submissions use this
    updateData.submission_status = 'issued';
  } else {
    updateData.total_amount_cents = totalAmount;  // All other entities use this
  }

  // Add merchant fee profile data for business licenses and service applications
  if (entityType === 'business_license' || entityType === 'service_application') {
    // Get fee profile data
    const { data: feeProfile } = await supabase
      .from('merchant_fee_profiles')
      .select('id, basis_points, fixed_fee, ach_basis_points, ach_fixed_fee')
      .eq('merchant_id', merchantData.merchantId)
      .single();
    
    if (feeProfile) {
      updateData.merchant_fee_profile_id = feeProfile.id;
      updateData.basis_points = feeProfile.basis_points;
      updateData.fixed_fee = feeProfile.fixed_fee;
      updateData.ach_basis_points = feeProfile.ach_basis_points;
      updateData.ach_fixed_fee = feeProfile.ach_fixed_fee;
    }
    
    // Determine payment type based on payment instrument and map to ENUM
    const isCard = finixPaymentInstrumentId.startsWith('PI');
    updateData.payment_type = mapPaymentTypeToEnum(isCard ? 'card' : 'ach');
  }

  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq(primaryKeyColumn, entityId);

  if (error) {
    console.error('[updateEntityStatus] Error:', error);
  }

  return { success: !error };
}

// Helper: Auto-issue entity
export async function autoIssueEntity(
  supabase: any,
  entityType: string,
  entityId: string
): Promise<void> {
  
  // Auto-issue permits when payment completes
  if (entityType === 'permit') {
    const { data: permit } = await supabase
      .from('permit_applications')
      .select('application_status')
      .eq('permit_id', entityId)
      .single();

    if (permit && permit.application_status === 'approved') {
      await supabase
        .from('permit_applications')
        .update({ application_status: 'issued' })
        .eq('permit_id', entityId);
      
      console.log('[autoIssueEntity] Permit auto-issued');
    }
  }

  // Auto-issue licenses when payment completes
  if (entityType === 'business_license') {
    const { data: license } = await supabase
      .from('business_license_applications')
      .select('application_status')
      .eq('id', entityId)
      .single();

    if (license && license.application_status === 'approved') {
      await supabase
        .from('business_license_applications')
        .update({ 
          application_status: 'issued',
          issued_at: new Date().toISOString()
        })
        .eq('id', entityId);
      
      console.log('[autoIssueEntity] License auto-issued');
    }
  }

  // Auto-issue service applications based on requires_review flag and has_time_slots
  if (entityType === 'service_application') {
    // First, get the application
    const { data: application, error: appError } = await supabase
      .from('municipal_service_applications')
      .select('status, tile_id')
      .eq('id', entityId)
      .single();

    if (appError || !application) {
      console.log('[autoIssueEntity] Service application not found:', appError);
      return;
    }

    // Then, get the service tile to check requires_review and has_time_slots
    const { data: tile, error: tileError } = await supabase
      .from('municipal_service_tiles')
      .select('requires_review, has_time_slots')
      .eq('id', application.tile_id)
      .single();

    if (tileError || !tile) {
      console.log('[autoIssueEntity] Service tile not found:', tileError);
      return;
    }

    const requiresReview = tile.requires_review;
    const hasTimeSlots = tile.has_time_slots;
    let shouldProcess = false;

    if (requiresReview === false) {
      // No review required: auto-process from any status
      shouldProcess = true;
      console.log('[autoIssueEntity] Service application requires_review=false, auto-processing from status:', application.status);
    } else {
      // Review required: only auto-process if already approved
      shouldProcess = application.status === 'approved';
      console.log('[autoIssueEntity] Service application requires_review=true, status:', application.status, 'shouldProcess:', shouldProcess);
    }

    if (shouldProcess) {
      // Determine final status based on whether service has time slots
      const finalStatus = hasTimeSlots ? 'reserved' : 'issued';
      const updateData: any = { status: finalStatus };
      
      // Only set issued_at for non-bookable services
      if (!hasTimeSlots) {
        updateData.issued_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('municipal_service_applications')
        .update(updateData)
        .eq('id', entityId);
      
      if (updateError) {
        console.log('[autoIssueEntity] Failed to update application:', updateError);
      } else {
        console.log(`[autoIssueEntity] Service application auto-processed to status: ${finalStatus}`);
      }
    }
  }
}
