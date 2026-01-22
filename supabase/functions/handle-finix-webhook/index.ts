import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../shared/cors.ts";
import { 
  updateTransactionStatus, 
  updateEntityStatus, 
  autoIssueEntity 
} from "../shared/unifiedPaymentProcessor.ts";
import { FinixWebhookEvent } from "../shared/types/finix.ts";

console.log("Finix Webhook Handler initialized");

serve(async (req) => {
  // 1. CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Get Raw Body (Critical for signature verification)
    const rawBody = await req.text();
    
    // 3. Authentication - Bearer Token (Finix sends Authorization: Bearer <token>)
    const authHeader = req.headers.get("Authorization");
    const expectedToken = Deno.env.get("FINIX_WEBHOOK_BEARER_TOKEN");

    if (expectedToken && expectedToken !== "paste_your_token_here") {
      // Verify Bearer token when configured
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("Missing or invalid Authorization header");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const receivedToken = authHeader.substring(7); // Remove "Bearer " prefix
      if (receivedToken !== expectedToken) {
        console.error("Bearer token mismatch");
        return new Response(JSON.stringify({ error: "Invalid Token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      console.log("✅ Bearer token verified successfully");
    } else {
      // No token configured - accept all requests (setup mode)
      console.warn("⚠️ FINIX_WEBHOOK_BEARER_TOKEN not configured - skipping authentication");
      if (authHeader) {
        console.log("📝 Authorization header received (not verified)");
      }
    }

    // 4. Parse Payload
    const payload = JSON.parse(rawBody) as FinixWebhookEvent;
    const eventId = payload.id;
    const eventType = payload.type; // e.g., 'created', 'updated'
    const entityType = payload.entity; // e.g., 'transfer'

    console.log(`Received Webhook: ${eventId} (${entityType}.${eventType})`);

    // 5. Log to DB (Audit Trail)
    // Extract entity ID from any entity type
    let entityId: string | null = null;
    if (payload._embedded) {
      if (payload._embedded.transfers?.[0]) entityId = payload._embedded.transfers[0].id;
      else if (payload._embedded.merchants?.[0]) entityId = payload._embedded.merchants[0].id;
      else if (payload._embedded.identities?.[0]) entityId = (payload._embedded.identities[0] as { id: string }).id;
      else if (payload._embedded.instruments?.[0]) entityId = (payload._embedded.instruments[0] as { id: string }).id;
      else if (payload._embedded.disputes?.[0]) entityId = (payload._embedded.disputes[0] as { id: string }).id;
    }

    const { error: logError } = await supabaseClient
      .from('finix_webhook_logs')
      .insert({
        event_id: eventId,
        event_type: `${entityType}.${eventType}`,
        entity_id: entityId,
        payload: payload,
        status: 'processing'
      });
    
    if (logError) {
      console.error("Failed to log webhook", logError);
      // Continue processing even if logging fails? Maybe strictly speaking we should fail, but let's proceed.
    }

    // 6. Idempotency & Processing
    if (entityType === 'transfer') {
      const transfer = payload._embedded.transfers?.[0];
      if (!transfer) {
          throw new Error("Transfer payload missing in transfer event");
      }

      const finixTransferId = transfer.id;
      const transferState = transfer.state; // 'SUCCEEDED', 'FAILED', etc.

      // Check existing transaction
      const { data: transaction } = await supabaseClient
        .from('payment_transactions')
        .select('id, payment_status, merchant_id, entity_type, entity_id, idempotency_id, service_fee_cents, total_amount_cents, payment_instrument_id, finix_payment_instrument_id')
        .eq('finix_transfer_id', finixTransferId)
        .maybeSingle();

      if (transaction) {
         // Idempotency: If already in final state, skip
         if (transaction.payment_status === 'paid' && transferState === 'SUCCEEDED') {
            console.log("Transaction already paid, skipping idempotent update");
            return new Response(JSON.stringify({ received: true, status: "skipped_idempotent" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
         }
         
         if (transaction.payment_status === 'failed' && transferState === 'FAILED') {
            console.log("Transaction already failed, skipping idempotent update");
            return new Response(JSON.stringify({ received: true, status: "skipped_idempotent" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
         }

         // Update Logic
         let paymentStatus = transaction.payment_status;
         if (transferState === 'SUCCEEDED') paymentStatus = 'paid';
         else if (transferState === 'FAILED' || transferState === 'CANCELED') paymentStatus = 'failed';

         // Update Transaction and Webhook Tracking
         await updateTransactionStatus(
           supabaseClient,
           transaction.id,
           finixTransferId,
           transaction.finix_payment_instrument_id || '',
           paymentStatus,
           transferState
         );

         // Update webhook tracking fields
         await supabaseClient
           .from('payment_transactions')
           .update({
             last_webhook_event_id: eventId,
             last_webhook_received_at: new Date().toISOString()
           })
           .eq('id', transaction.id);

         // Trigger Business Logic if Succeeded
         if (transferState === 'SUCCEEDED' && transaction.payment_status !== 'paid') {
            // Fetch merchant data for entity status update
            const { data: merchant } = await supabaseClient
                .from('merchants')
                .select('id, finix_merchant_id, merchant_name')
                .eq('id', transaction.merchant_id)
                .single();
            
            if (merchant) {
                const merchantParams = {
                    finixMerchantId: merchant.finix_merchant_id,
                    merchantId: merchant.id,
                    merchantName: merchant.merchant_name
                };

               await updateEntityStatus(
                 supabaseClient,
                 transaction.entity_type,
                 transaction.entity_id,
                 transaction.idempotency_id || '',
                 transaction.service_fee_cents,
                 transaction.total_amount_cents,
                 transaction.payment_instrument_id || '', // Use stored PI ID
                 finixTransferId,
                 merchantParams
               );

               // Auto Issue
               await autoIssueEntity(
                 supabaseClient,
                 transaction.entity_type,
                 transaction.entity_id
               );
            }
         }
      }
    } else if (entityType === 'merchant') {
      // HANDLE MERCHANT EVENTS (created, updated, underwritten)
      const merchant = payload._embedded.merchants?.[0];
      
      if (merchant) {
        const finixMerchantId = merchant.id;
        const onboardingState = merchant.onboarding_state; // PROVISIONING, APPROVED, REJECTED, etc.
        const processingEnabled = merchant.processing_enabled ?? false;
        const settlementEnabled = merchant.settlement_enabled ?? false;
        
        console.log(`Processing merchant event: ${eventType} for ${finixMerchantId}, state: ${onboardingState}`);
        
        // Find local merchant by finix_merchant_id
        const { data: localMerchant, error: findError } = await supabaseClient
          .from('merchants')
          .select('id, verification_status, processing_status, finix_raw_response')
          .eq('finix_merchant_id', finixMerchantId)
          .maybeSingle();
        
        if (localMerchant) {
          // Map Finix onboarding_state to our verification_status
          let verificationStatus = localMerchant.verification_status;
          let processingStatus = localMerchant.processing_status;
          
          // Status mapping based on Finix documentation
          switch (onboardingState) {
            case 'PROVISIONING':
              verificationStatus = 'Pending';
              processingStatus = 'merchant_created';
              break;
            case 'APPROVED':
              verificationStatus = 'Approved';
              processingStatus = 'approved';
              break;
            case 'REJECTED':
              verificationStatus = 'Rejected';
              processingStatus = 'rejected';
              break;
            case 'UPDATE_REQUESTED':
              verificationStatus = 'Update Requested';
              processingStatus = 'update_requested';
              break;
          }
          
          // Special handling for underwritten event
          if (eventType === 'underwritten') {
            verificationStatus = 'Approved';
            processingStatus = 'approved';
            console.log(`🎉 Merchant ${finixMerchantId} has been UNDERWRITTEN and approved!`);
          }
          
          // Build update object with dedicated columns
          const updateData: Record<string, unknown> = {
            verification_status: verificationStatus,
            processing_status: processingStatus,
            processing_enabled: processingEnabled,
            settlement_enabled: settlementEnabled,
            onboarding_state: onboardingState,
            updated_at: new Date().toISOString()
          };
          
          // Update processing/settlement enabled if columns exist
          // Store in finix_raw_response if not
          const existingResponse = localMerchant.finix_raw_response || {};
          updateData.finix_raw_response = {
            ...existingResponse,
            latest_webhook: {
              event_type: eventType,
              onboarding_state: onboardingState,
              processing_enabled: processingEnabled,
              settlement_enabled: settlementEnabled,
              received_at: new Date().toISOString()
            }
          };
          
          // Update the merchant record
          const { error: updateError } = await supabaseClient
            .from('merchants')
            .update(updateData)
            .eq('id', localMerchant.id);
          
          if (updateError) {
            console.error(`Failed to update merchant ${localMerchant.id}:`, updateError);
          } else {
            console.log(`✅ Updated merchant ${localMerchant.id}: status=${verificationStatus}, processing=${processingStatus}`);
          }
        } else {
          console.warn(`Local merchant not found for Finix merchant ID: ${finixMerchantId}`);
        }
      }
    } else if (entityType === 'identity') {
      // HANDLE IDENTITY EVENTS
      const identity = payload._embedded.identities?.[0];
      
      if (identity) {
        const finixIdentityId = identity.id;
        console.log(`Processing identity event: ${eventType} for ${finixIdentityId}`);
        
        // Find local merchant by finix_identity_id
        const { data: localMerchant } = await supabaseClient
          .from('merchants')
          .select('id, finix_raw_response')
          .eq('finix_identity_id', finixIdentityId)
          .maybeSingle();
        
        if (localMerchant) {
          // Store identity update in raw response
          const existingResponse = localMerchant.finix_raw_response || {};
          
          await supabaseClient
            .from('merchants')
            .update({
              finix_raw_response: {
                ...existingResponse,
                latest_identity_webhook: {
                  event_type: eventType,
                  identity_id: finixIdentityId,
                  received_at: new Date().toISOString()
                }
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', localMerchant.id);
          
          console.log(`✅ Updated identity info for merchant ${localMerchant.id}`);
        } else {
          console.warn(`Local merchant not found for Finix identity ID: ${finixIdentityId}`);
        }
      }
    } else if (entityType === 'instrument') {
      // HANDLE PAYMENT INSTRUMENT EVENTS (card expiry updates, etc.)
      const instrument = payload._embedded.instruments?.[0] || payload._embedded.payment_instruments?.[0];
      
      if (instrument) {
        const finixInstrumentId = instrument.id;
        console.log(`Processing instrument event: ${eventType} for ${finixInstrumentId}`);
        
        // Check if it's a user payment instrument (card)
        const { data: userInstrument } = await supabaseClient
          .from('user_payment_instruments')
          .select('id, card_expiration_month, card_expiration_year')
          .eq('finix_payment_instrument_id', finixInstrumentId)
          .maybeSingle();
        
        if (userInstrument && eventType === 'updated') {
          // Update card expiry if changed
          const newExpMonth = (instrument as { expiration_month?: number }).expiration_month;
          const newExpYear = (instrument as { expiration_year?: number }).expiration_year;
          
          if (newExpMonth && newExpYear) {
            await supabaseClient
              .from('user_payment_instruments')
              .update({
                card_expiration_month: newExpMonth,
                card_expiration_year: newExpYear,
                updated_at: new Date().toISOString()
              })
              .eq('id', userInstrument.id);
            
            console.log(`✅ Updated card expiry for instrument ${userInstrument.id}`);
          }
        }
      }
    } else if (entityType === 'dispute') {
      // HANDLE DISPUTE EVENTS (chargebacks)
      const dispute = payload._embedded.disputes?.[0];
      
      if (dispute) {
        const finixDisputeId = dispute.id;
        const finixTransferId = (dispute as { transfer?: string }).transfer;
        const state = (dispute as { state?: string }).state || 'PENDING';
        const reason = (dispute as { reason?: string }).reason;
        const amount = (dispute as { amount?: number }).amount || 0;
        const respondBy = (dispute as { respond_by?: string }).respond_by;
        const occurredAt = (dispute as { occurred_at?: string }).occurred_at;
        const message = (dispute as { message?: string }).message;
        const disputeDetails = (dispute as { dispute_details?: Record<string, unknown> }).dispute_details;
        const finixApplicationId = (dispute as { application?: string }).application;
        const finixIdentityId = (dispute as { identity?: string }).identity;
        
        console.log(`Processing dispute event: ${eventType} for ${finixDisputeId}, state: ${state}, reason: ${reason}`);
        
        // Try to find the associated payment transaction
        let paymentTransactionId: string | null = null;
        let merchantId: string | null = null;
        
        if (finixTransferId) {
          const { data: transaction } = await supabaseClient
            .from('payment_transactions')
            .select('id, merchant_id')
            .eq('finix_transfer_id', finixTransferId)
            .maybeSingle();
          
          if (transaction) {
            paymentTransactionId = transaction.id;
            merchantId = transaction.merchant_id;
          }
        }
        
        if (eventType === 'created') {
          // Insert new dispute record
          const { error: insertError } = await supabaseClient
            .from('finix_disputes')
            .insert({
              finix_dispute_id: finixDisputeId,
              finix_transfer_id: finixTransferId,
              finix_application_id: finixApplicationId,
              finix_identity_id: finixIdentityId,
              payment_transaction_id: paymentTransactionId,
              merchant_id: merchantId,
              state: state,
              reason: reason,
              amount_cents: amount,
              respond_by: respondBy,
              occurred_at: occurredAt,
              message: message,
              dispute_details: disputeDetails,
              last_webhook_event_id: eventId,
              last_webhook_received_at: new Date().toISOString()
            });
          
          if (insertError) {
            // Might be duplicate, try update instead
            if (insertError.code === '23505') {
              console.log(`Dispute ${finixDisputeId} already exists, will update`);
            } else {
              console.error(`Failed to insert dispute ${finixDisputeId}:`, insertError);
            }
          } else {
            console.log(`⚠️ DISPUTE CREATED: ${finixDisputeId} - Reason: ${reason}, Amount: ${amount / 100}`);
          }
        }
        
        if (eventType === 'updated' || eventType === 'created') {
          // Update existing dispute (or upsert if created handler hit duplicate)
          const { error: updateError } = await supabaseClient
            .from('finix_disputes')
            .update({
              state: state,
              reason: reason,
              amount_cents: amount,
              respond_by: respondBy,
              message: message,
              dispute_details: disputeDetails,
              last_webhook_event_id: eventId,
              last_webhook_received_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('finix_dispute_id', finixDisputeId);
          
          if (updateError) {
            console.error(`Failed to update dispute ${finixDisputeId}:`, updateError);
          } else {
            console.log(`✅ Updated dispute ${finixDisputeId}: state=${state}`);
          }
        }
      }
    } else {
      // Log unhandled entity types for monitoring
      console.log(`ℹ️ Unhandled entity type: ${entityType}.${eventType} - logged but no specific handler`);
    }


    // Update log status to processed
    if (eventId) {
        await supabaseClient.from('finix_webhook_logs')
        .update({ status: 'processed' })
        .eq('event_id', eventId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Webhook processing error:", err);
    
    // Log error to DB if possible (though we might not have the event ID if parsing failed)
    // We return 200 to acknowledge receipt unless it's a transient error, 
    // but standard practice is often 400 for bad requests, 500 for server errors.
    // Finix retries on non-2xx. If code is buggy, we don't want infinite retries.
    // But if DB is down, we do want retries.
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, // Or 500? Let's say 400 for logic errors to stop retries.
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
