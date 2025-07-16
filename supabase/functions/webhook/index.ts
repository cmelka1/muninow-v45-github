import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-finix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Finix webhook signature verification
async function verifyFinixSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) {
    console.log('⚠️ No Finix signature provided');
    return false; // In production, you might want to reject unsigned webhooks
  }
  
  // TODO: Implement proper Finix signature verification when webhook secret is available
  // For now, we'll log the signature and allow the webhook through
  console.log('📝 Finix signature received:', signature);
  return true;
}

// Map Finix onboarding states to MuniNow statuses
function mapFinixStatus(finixState: string): { verification_status: string; processing_status: string } {
  switch (finixState?.toUpperCase()) {
    case 'PROVISIONING':
      return { verification_status: 'pending', processing_status: 'pending' };
    case 'APPROVED':
      return { verification_status: 'approved', processing_status: 'merchant_created' };
    case 'ENABLED':
      return { verification_status: 'approved', processing_status: 'processing_enabled' };
    case 'REJECTED':
      return { verification_status: 'rejected', processing_status: 'rejected' };
    case 'DISABLED':
      return { verification_status: 'approved', processing_status: 'disabled' };
    default:
      console.log(`⚠️ Unknown Finix state: ${finixState}`);
      return { verification_status: 'pending', processing_status: 'pending' };
  }
}

// Process different webhook event types
async function processWebhookEvent(eventData: any, correlationId: string): Promise<void> {
  const eventType = eventData.type;
  const eventObject = eventData.data?.object || eventData.object;
  
  console.log(`🔄 Processing event type: ${eventType}`);
  console.log(`📦 Event object:`, JSON.stringify(eventObject, null, 2));

  if (!eventObject) {
    console.log('⚠️ No event object found in webhook data');
    return;
  }

  // Extract merchant identifiers
  const finixMerchantId = eventObject.id;
  const finixIdentityId = eventObject.identity_id || eventObject.identity;
  
  if (!finixMerchantId && !finixIdentityId) {
    console.log('⚠️ No merchant or identity ID found in webhook');
    return;
  }

  // Find the merchant in our database
  let query = supabase.from('merchants').select('*');
  
  if (finixMerchantId) {
    query = query.eq('finix_merchant_id', finixMerchantId);
  } else if (finixIdentityId) {
    query = query.eq('finix_identity_id', finixIdentityId);
  }

  const { data: merchants, error: fetchError } = await query;
  
  if (fetchError) {
    console.error('❌ Error fetching merchant:', fetchError);
    return;
  }

  if (!merchants || merchants.length === 0) {
    console.log(`⚠️ No merchant found with Finix ID: ${finixMerchantId || finixIdentityId}`);
    return;
  }

  const merchant = merchants[0];
  console.log(`✅ Found merchant: ${merchant.merchant_name} (ID: ${merchant.id})`);

  // Prepare update data based on event type
  const updateData: any = {
    finix_raw_response: eventObject,
    updated_at: new Date().toISOString(),
  };

  // Handle different event types
  switch (eventType) {
    case 'merchant.verification.updated':
    case 'merchant.onboarding.state.updated':
    case 'merchant.updated':
      // Update onboarding state and derived statuses
      if (eventObject.onboarding_state) {
        const statusMapping = mapFinixStatus(eventObject.onboarding_state);
        updateData.onboarding_state = eventObject.onboarding_state;
        updateData.verification_status = statusMapping.verification_status;
        updateData.processing_status = statusMapping.processing_status;
        console.log(`📊 Status mapping: ${eventObject.onboarding_state} → verification: ${statusMapping.verification_status}, processing: ${statusMapping.processing_status}`);
      }
      
      // Update processing and settlement flags
      if (typeof eventObject.processing_enabled === 'boolean') {
        updateData.processing_enabled = eventObject.processing_enabled;
        console.log(`🔧 Processing enabled: ${eventObject.processing_enabled}`);
      }
      
      if (typeof eventObject.settlement_enabled === 'boolean') {
        updateData.settlement_enabled = eventObject.settlement_enabled;
        console.log(`💰 Settlement enabled: ${eventObject.settlement_enabled}`);
      }

      // Update other relevant fields
      if (eventObject.merchant_profile_id) {
        updateData.finix_merchant_profile_id = eventObject.merchant_profile_id;
      }
      
      if (eventObject.verification_id) {
        updateData.finix_verification_id = eventObject.verification_id;
      }
      break;

    case 'merchant.processing.enabled':
      updateData.processing_enabled = true;
      updateData.processing_status = 'processing_enabled';
      console.log('🔧 Processing enabled via webhook');
      break;

    case 'merchant.processing.disabled':
      updateData.processing_enabled = false;
      updateData.processing_status = 'disabled';
      console.log('🔧 Processing disabled via webhook');
      break;

    case 'merchant.settlement.enabled':
      updateData.settlement_enabled = true;
      console.log('💰 Settlement enabled via webhook');
      break;

    case 'merchant.settlement.disabled':
      updateData.settlement_enabled = false;
      console.log('💰 Settlement disabled via webhook');
      break;

    default:
      console.log(`ℹ️ Unhandled event type: ${eventType}, updating raw response only`);
  }

  // Update the merchant record
  const { error: updateError } = await supabase
    .from('merchants')
    .update(updateData)
    .eq('id', merchant.id);

  if (updateError) {
    console.error('❌ Error updating merchant:', updateError);
    throw updateError;
  }

  console.log(`✅ Successfully updated merchant ${merchant.merchant_name} (${merchant.id})`);
  console.log(`📝 Updated fields:`, Object.keys(updateData).join(', '));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`Rejected ${req.method} request - only POST allowed`);
    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: { 
        ...corsHeaders,
        'Allow': 'POST'
      }
    });
  }

  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  
  try {
    // Extract headers as JavaScript object
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Read raw request body (do not parse as JSON)
    const rawBody = await req.text();
    
    // Log debugging information
    console.log('=== Webhook Request Received ===');
    console.log('Correlation ID:', correlationId);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Content-Length:', headers['content-length'] || 'unknown');
    console.log('Remote IP:', req.headers.get('x-forwarded-for') || 'unknown');
    
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Raw Body:', rawBody);

    // Identify webhook source and process accordingly
    const userAgent = headers['user-agent'] || '';
    const finixSignature = headers['x-finix-signature'];
    
    if (userAgent.toLowerCase().includes('stripe')) {
      console.log('✅ Stripe webhook received');
      // TODO: Implement Stripe webhook processing if needed
    } else if (finixSignature || rawBody.includes('finix') || rawBody.includes('merchant')) {
      console.log('✅ Finix webhook received');
      
      // Verify signature (currently just logs)
      const isValidSignature = await verifyFinixSignature(rawBody, finixSignature);
      if (!isValidSignature) {
        console.log('⚠️ Invalid or missing Finix signature');
        // In production, you might want to reject invalid signatures
        // return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
      
      // Parse and process the webhook event
      try {
        const eventData = JSON.parse(rawBody);
        console.log('📋 Parsed webhook event data:', JSON.stringify(eventData, null, 2));
        
        // Process the webhook event
        await processWebhookEvent(eventData, correlationId);
        
        console.log('✅ Webhook event processed successfully');
      } catch (parseError) {
        console.error('❌ Error parsing webhook JSON:', parseError);
        console.log('📋 Raw body that failed to parse:', rawBody);
        
        // Still return success to avoid webhook retries for malformed data
        // In production, you might want to handle this differently
      }
    } else {
      console.log('❓ Unknown webhook source');
      console.log('🔍 Raw body preview:', rawBody.substring(0, 200));
    }

    const processingTime = Date.now() - startTime;
    console.log(`Processing completed in ${processingTime}ms`);
    console.log('=== End Webhook Request ===\n');

    // Return success response
    return new Response('OK', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Webhook processing error:', error);
    console.error('Correlation ID:', correlationId);
    console.error(`Failed after ${processingTime}ms`);
    
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });
  }
});